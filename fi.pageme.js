/*
 * PageMe
 * Version 0.1
 *
 * Description:
 * Allows you to simply add pagination to any sort of data. It automatically builds pagination required markup as following:
 * <div class="fi-pageme-container">
 *  <div class="fi-pageme-frame">
 *      <span class="fi-pageme-loading"></span>
 *      <ul class="fi-pageme-pages">
 *          <li class="fi-pageme-page" data-page="X">...</li>
 *      </ul>
 *  </div>
 *  <nav class="fi-pageme-pager">
 *      <ul>
 *          <li class="fi-pageme-info">Page X of Y</li>
 *          <li class="fi-pageme-prev"><a href="#">Previous</a></li>
 *          <li class="fi-pageme-page"><a href="#X">X</a></li>...
 *          <li class="fi-pageme-next"><a href="#">Next</a></li>
 *      </ul>
 *  </nav>
 * </div>
 *
 * Dependencies:
 * jQuery 1.7.x, Mustache.js
 *
 */

(function ($) {
    function PageMe(el, options) {
        var self = this;
        self.el = el;
        self.options = options;

        /* setup pages */
        function setup() {
            var d = $('<div/>'), tpages = null, ul, i, ii;
            d.append(self.options.setupTemplate);
            self.pagerView = {};
            if (self.options.pages && (tpages = el.find(self.options.pages))) {
                // pages are there
                i = 1;
                ul = d.find('ul.fi-pageme-pages');
                tpages.each(function () {
                    var li = $('<li class="fi-pageme-page"></li>').attr('data-page', i);
                    $(this).appendTo(li);
                    li.appendTo(ul);
                    if ($.isFunction(self.options.onLoadCompleted)) self.options.onLoadCompleted(li);
                });
            } else {
                d.find('.fi-pageme-container').addClass('loading');
            }
            d.children().appendTo(self.el);


            self.mainContainer = self.el.find('.fi-pageme-container');
            self.mainUL = self.mainContainer.find('ul.fi-pageme-pages');
            self.pager = {
                e: self.mainContainer.find('nav.fi-pageme-pager ul')
            };
            self.frame = self.mainContainer.find('.fi-pageme-frame');
            self.mainContainer.addClass('fi-pageme-' + self.options.effect);

            self.mainUL.children().each(function () {
                var x = $(this);
                // find width/height
                x.css({ display: 'block', visibility: 'hidden' });
                var w = x.outerWidth(1);
                var h = x.outerHeight(1);
                x.css({ display: '', visibility: 'visible' });
                x.data('dimension', { width: w, height: h });
            });
            // setup pager
            if (self.options.pagerSettings && self.options.pagerSettings.enabled) {
                self.pager.e.addClass(self.options.pagerSettings.pagerClass);

                if (self.options.pagerSettings.showInfo) {
                    self.pager.info = $(Mustache.render('<li class="fi-pageme-info">' + self.options.resources.info + '</li>', { current: self.options.currentPage, total: self.options.totalPages }));
                    self.pager.e.append(self.pager.info);
                }

                if (self.options.pagerSettings.viewAll) {
                    self.pager.all = $(Mustache.render('<li class="fi-pageme-all"><a href="{{allurl}}">' + self.options.resources.viewAll + '</a></li>', { allurl: self.options.pagerSettings.viewAllUrl }));
                    self.pager.e.append(self.pager.all);
                }

                if (self.options.pagerSettings.showNextPrev) {
                    self.pager.previous = $('<li class="fi-pageme-previous"><a href="#" class="icon icon-previous">' + self.options.resources.previous + '</></li>');
                    self.pager.previous.find('a').on('click', function (evt) {
                        evt.preventDefault();
                        if ($(this).hasClass('disabled')) {
                            return;
                        }

                        goTo(self.options.currentPage - 1);
                    });
                    self.pager.e.append(self.pager.previous);
                }

                if (self.options.pagerSettings.showNumbers) {
                    self.pager.numbers = [];
                    for (i = 1, ii = Math.min(self.options.totalPages, self.options.maxPages); i <= ii; i++) {
                        var pn = $(Mustache.render('<li class="fi-pageme-page" title="' + self.options.resources.goTo + '"><a href="#{{pagenumber}}">{{pagenumber}}</a></li>', { pagenumber: i })).attr('data-page', i);
                        pn.find('a').on('click', function (evt) {
                            evt.preventDefault();
                            var dady = $(this).parent();
                            if (dady.hasClass('current')) {
                                // good dady
                                return;
                            } else {
                                // take pagenumber from dady's pocket and go to that page
                                var pn = dady.data('page');
                                goTo(pn);
                            }
                        });
                        self.pager.numbers.push(pn);
                        self.pager.e.append(pn);
                    }
                }

                if (self.options.pagerSettings.showNextPrev) {
                    self.pager.next = $('<li class="fi-pageme-next"><a href="#" class="icon icon-next">' + self.options.resources.next + '</></li>');
                    self.pager.next.find('a').on('click', function (evt) {
                        evt.preventDefault();
                        if ($(this).hasClass('disabled')) {
                            return;
                        }

                        goTo(self.options.currentPage + 1);
                    });
                    self.pager.e.append(self.pager.next);
                }
            } else {
                self.mainContainer.find('nav.fi-pageme-pager').remove();
                self.options.pagerSettings = { enabled: false };
            }

            if (self.options.isResponsive) {
                $(window).on('resize', windowResizeHandler);
            }

            goTo(1);
        }

        /* Go to specific page */
        function goTo(pageNumber) {
            var targetLi = self.mainUL.find('li[data-page=' + pageNumber + ']');
            if (targetLi && targetLi.length) {
                // we already have this page, just switch to it
                self.pagerView.current = pageNumber;
                doTransition(targetLi, self.pagerView);
            } else {
                // load the page
                var d = {};
                if ($.isFunction(self.options.userData)) {
                    d = self.options.userData();
                } else {
                    d = self.options.userData || {};
                }
                d.pageIndex = pageNumber;
                self.mainContainer.addClass('loading');
                $.ajax({
                    url: self.options.url,
                    data: $.toJSON(d),
                    success: function (response) {
                        self.mainContainer.removeClass('loading');
                        var p = populatePage(pageNumber, response.d);
                        self.pagerView.current = pageNumber;
                        doTransition(p, self.pagerView);
                    },
                    error: function () {
                        self.options.onError();
                    },
                    type: 'POST',
                    dataType: 'json',
                    contentType: 'application/json; charset=utf-8'
                });
            }
        }

        /* Perform Transition */
        function doTransition(newPage, pagerView) {

            if (self.options.effect === 'fade') {
                var cp = self.mainUL.children().filter('.current');
                if (cp.length > 0) {
                    newPage.hide();
                    cp.fadeOut(self.options.speed, function () { cp.removeClass('current'); });
                    newPage.fadeIn(self.options.speed, function () { newPage.addClass('current'); });
                    recomputeItemSize(newPage);
                    var d = newPage.data('dimension');
                    self.mainUL.width(d.width);
                    self.mainUL.height(d.height);
                    self.frame.animate({ height: d.height + 'px' }, self.options.speed);
                } else {
                    newPage.addClass('current');
                    recomputeItemSize(newPage);
                    var d = newPage.data('dimension');
                    self.mainUL.width(d.width);
                    self.mainUL.height(d.height);
                    self.frame.height(d.height);
                }
            }

            self.options.currentPage = newPage.data('page');

            // update pager
            if (self.options.pagerSettings.enabled) {
                if (self.options.pagerSettings.showNumbers) {
                    self.pager.e.children().removeClass('current').filter('[data-page=' + pagerView.current + ']').addClass('current');
                }

                if (self.options.pagerSettings.showInfo) {
                    self.pager.info.html(Mustache.render(self.options.resources.info, { current: self.options.currentPage, total: self.options.totalPages }));
                }

                if (self.options.pagerSettings.showNextPrev) {
                    if (self.options.currentPage > 1) {
                        self.pager.previous.find('a').removeClass('disabled');
                    } else {
                        self.pager.previous.find('a').addClass('disabled');
                    }

                    if (self.options.currentPage < self.options.totalPages) {
                        self.pager.next.find('a').removeClass('disabled');
                    } else {
                        self.pager.next.find('a').addClass('disabled');
                    }
                }
            }
        }

        /* Populate pages that retrived by AJAX call */
        function populatePage(pageNumber, data) {
            self.options.viewExtend(data);
            var li = $('<li class="fi-pageme-page"></li>').attr('data-page', pageNumber);
            /* New in version 1.0.1 */
            var html = Mustache.render(self.options.template, data, self.options.partials);
            if (window.html5) {
                /* this is legacy support for using html5 on browsers like IE8-, 
                html5shiv will take care of inner html, we can just copy it to innerHtml, 
                and then take the nodes and use by jquery */
                var d = document.createElement('div');
                d.innerHTML = html;
                li.append($(d).children());
            } else {
                li.append(html);
            }
            /* -- end -- */
            li.appendTo(self.mainUL);
            // find width/height of li
            li.css({ display: 'block', visibility: 'hidden', width: self.mainContainer.width() + 'px' });
            var w = li.outerWidth(1);
            var h = li.outerHeight(1);
            li.css({ display: '', visibility: 'visible' });
            li.data('dimension', { width: w, height: h });
            if ($.isFunction(self.options.onLoadCompleted)) self.options.onLoadCompleted(li);
            return li;
        }

        /* This is required for Responsive/fluid designs */
        function recomputeItemSize(el, stopUpdate) {
            if (el && el.length) {
                var w = self.mainContainer.width();
                el.width(w).height('auto');
                var h = el.outerHeight(1);
                el.data('dimension', { width: w, height: h });
                if (stopUpdate) return;
                self.frame.height(h);
                self.mainUL.width(w).height(h);
            }
        }
        /* This is required for Responsive/fluid designs */
        function windowResizeHandler() {
            recomputeItemSize(self.mainUL.find('li:visible'));
        }

        /* INITIALIZE */
        if (self.options.removeElements) self.el.find(self.options.removeElements).remove();
        setup();

    }

    /* Pageme function extension */
    $.fn.pageme = function () {
        var args = arguments;

        /* Check for function call */
        if (args.length > 1 || (args.length == 1 && typeof (args[0]) === 'string')) {
            // it is function call
            return this.each(function () {
                var el = $(this);
                var pme = el.data('fi-pageme');
                if (pme) {
                    pme.invoke(args);
                }
            });
        } else {
            // initialization
            var opt = $.extend(true, {}, $.fn.pageme.defaults, args[0] || {});
            return this.each(function () {
                var el = $(this);
                if (el.hasClass('fi-pageme-initialized')) {
                    var pme = el.data('fi-pageme');
                    if (pme) {
                        return;
                    }
                }
                var pmeObject = new PageMe(el, opt);
                el.addClass('fi-pageme-initialized').data('fi-pageme', pmeObject);
            });
        }
    };

    $.fn.pageme.defaults = {
        pages: null, /* Page content selector. This should be the root element which contains content and will be populated for every page, such as article or div or ul tag */
        isResponsive: true, /* New in version 1.0.1: Support responsive design (updates the width/height on window resize + each page change */
        removeElements: null, /* New in version 1.0.1: Removes items that matches the selector. Can be used to remove static pager generated by .Net with Dynamic js Pager, etc. */
        template: '', /* Template to generate content. Currently supports Mustache as JS Templating framework */
        partials: null, /* Partial views for generating content. It is useful when you have a list of items on each page and you want to simpilify your template */
        url: '', /* URL for AJAX load */
        onError: $.noop, /* What to do if ajax call failed */
        userData: {}, /* UserData to be passed to pager. Can be a function or object. */
        viewExtend: $.noop, /* This function will be called when Ajax call completed and before populating date. It will pass the response.d to this function. This lets you to extend view and add some other computed properties that you want to use in template */
        onLoadCompleted: $.noop, /* New in version 1.0.1: Allows to do other required actions on the recently generated items. It passes the LI element to this function. */
        maxPages: 100000, /* Max pages to display. It will use Min(maxPages, totalPages). It is useful when you want to restrict number of pages like in homepage */
        totalPages: 0, /* Total number of pages */
        currentPage: 1,
        effect: 'fade', /* Currently only fade is supported */
        speed: 500, /* Speed for pagination effect */
        pagerSettings: {
            enabled: true, /* Enable pager */
            showInfo: false, /* Show info or not? */
            viewAll: true, /* Show view all */
            viewAllUrl: '', /* If you want to show view all, which URL to be used */
            showNextPrev: true, /* Show next/previous links? */
            showNumbers: true, /* Show page numbers? */
            pagerClass: '' /* Add custom class to your page numbers */
        },
        autoPaging: false, /* Auto paging, currently not implemeneted */
        isContinuous: false, /* Is Continuous? currently not implemented */
        setupTemplate: '<div class="fi-pageme-container"><div class="fi-pageme-frame clearfix"><span class="fi-pageme-loading"></span><ul class="fi-pageme-pages"></ul></div><nav class="fi-pageme-pager clearfix"><ul></ul></nav></div>', /* Template that pager will use. Feel free to update it, but keep the class names as it is. Current template contains HTML 5 tags. */
        resources: {
            info: 'Page {{current}} of {{total}}',
            viewAll: 'View All',
            next: 'Next',
            previous: 'Previous',
            goTo: 'Go to page {{pagenumber}}'
        }
    };

} (jQuery));