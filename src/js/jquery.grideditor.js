/**
 * Frontwise grid editor plugin.
 */
(function( $ ){

$.fn.gridEditor = function( options ) {

    var self = this;
    var grideditor = self.data('grideditor');

    /** Methods **/

    if (arguments[0] == 'getHtml') {
        if (grideditor) {
            grideditor.deinit();
            var html = self.html();
            grideditor.init();
            return html;
        } else {
            return self.html();
        }
    }

    if (arguments[0] == 'remove') {
        if (grideditor) {
            grideditor.remove();
        }
        return;
    }

    /** Initialize plugin */

    self.each(function(baseIndex, baseElem) {
        baseElem = $(baseElem);

        var settings = $.extend(true, {
            'new_row_layouts'   : [ // Column layouts for add row buttons
                                    [12],
                                    [6, 6],
                                    [4, 4, 4],
                                    [3, 3, 3, 3],
                                    [2, 2, 2, 2, 2, 2],
                                    [2, 8, 2],
                                    [4, 8],
                                    [8, 4]
                                ],
            'row_classes'       : [], /* Example: { label: 'Example class', cssClass: 'example-class'} */
            'col_classes'       : [], /* Example: { label: 'Example class', cssClass: 'example-class'} */
            'col_tools'         : [], /* Example:
                                        [ {
                                            title: 'Set background image',
                                            iconClass: 'glyphicon-picture',
                                            on: { click: function() {} }
                                        } ]
                                    */
            'row_tools'         : [],
            'custom_filter'     : '',
            'content_types'     : ['tinymce'],
            'valid_col_sizes'   : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            'source_textarea'   : '',
            'i18n'				: {
            	'layouts'		: {
            		'xl'		: 'Large desktop',
            		'lg'		: 'Desktop',
                    'md'		: 'Tablet',
                    'sm'		: 'Phone, landscape',
                    'xs'		: 'Phone, portrait'
            	},
            	'buttons'		: {
            		'html'		: 'Edit Source Code',
            		'preview'	: 'Preview'
            	},
            	'tools'			: {
            		'move'		: 'Move',
            		'settings'	: 'Settings',
        			'setId'		: 'Set a unique identifier',
        			'toggleClass'	: 'Toggle {0} styling',
            		'row'		: {
            			'add'		: 'Add row',
            			'remove'	: 'Remove row',
            			'confirm'	: 'Delete row?'
            		},
            		'col'		: {
            			'add'		: 'Add column',
            			'remove'	: 'Remove col',
            			'confirm'	: 'Delete column?'
            		},
            		'size'		: {
            			'decrease'	: 'Make column narrower\n(hold shift for min)',
            			'increase'	: 'Make column wider\n(hold shift for max)'
            		},
            		'offset'	: {
            			'decrease'	: 'Decrease column offset\n(hold shift for min)',
            			'increase'	: 'Increase column offset\n(hold shift for max)'
            		}
            	}
            }
        }, options);


        // Elems
        var canvas,
            mainControls,
            wrapper, // controls wrapper
            addRowGroup,
            htmlTextArea
        ;
        var colClasses = ['col-xl-', 'col-lg-', 'col-md-', 'col-sm-', 'col-'];
        var offsetClasses = ['offset-xl-', 'offset-lg-', 'offset-md-', 'offset-sm-', 'offset-'];
        var curColClassIndex = 1; // Index of the column class we are manipulating currently
        var MAX_COL_SIZE = 12;

        // Copy html to sourceElement if a source textarea is given
        if (settings.source_textarea) {
            var sourceHtml = $(settings.source_textarea).val();
            if(sourceHtml.length > 0 && $('<div>'+sourceHtml+'</div>').find('.row').addBack('.row').length == 0) {
                var row = createRow();
                var column = createColumn(12).appendTo(row);
                column.find('.ge-content').html(sourceHtml);
                sourceHtml = column.html();
            }
            baseElem.html(sourceHtml);
        }

        // Wrap content if it is non-bootstrap
        if (baseElem.children().length && !baseElem.find('div.row').length) {
            var children = baseElem.children();
            var newRow = $('<div class="row"><div class="col-12" /></div>').appendTo(baseElem);
            newRow.find('.col-12').append(children);
        }

        setup();
        init();

        function setup() {
            /* Setup canvas */
            canvas = baseElem.addClass('ge-canvas');

            htmlTextArea = $('<textarea class="ge-html-output" />').insertBefore(canvas);

            /* Create main controls*/
            mainControls = $('<div class="ge-mainControls" />').insertBefore(htmlTextArea);
            wrapper = $('<div class="ge-wrapper ge-top" />').appendTo(mainControls);

            // Add row
            addRowGroup = $('<div class="ge-addRowGroup btn-group" />').appendTo(wrapper);
            $.each(settings.new_row_layouts, function(j, layout) {
                var btn = $('<a class="btn btn-sm btn-primary" />')
                    .attr('title', settings.i18n.tools.row.add + ' ' + layout.join('-'))
                    .on('click', function() {
                        var row = createRow().appendTo(canvas);
                        layout.forEach(function(i) {
                            createColumn(i).appendTo(row);
                        });
                        init();
                        if (row[0].scrollIntoView) row[0].scrollIntoView({behavior: 'smooth'});
                    })
                    .appendTo(addRowGroup)
                ;

                btn.append('<i class="fas fa-plus fa-fw"></i>');

                var layoutName = layout.join(' - ');
                var icon = '<div class="row ge-row-icon">';
                layout.forEach(function(i) {
                    icon += '<div class="column col-' + i + '"/>';
                });
                icon += '</div>';
                btn.append(icon);
            });

            // Buttons on right
            var layoutDropdown = $('<div class="dropdown pull-right ge-layout-mode">' +
                '<button type="button" class="btn btn-sm btn-primary dropdown-toggle" data-toggle="dropdown">' + settings.i18n.layouts.lg + '</button>' +
                    '<div class="dropdown-menu" role="menu">' +
                    	'<a class="dropdown-item" title="' + settings.i18n.layouts.xl + '">' + settings.i18n.layouts.xl + '</a>'+
                        '<a class="dropdown-item" data-width="auto" title="' + settings.i18n.layouts.lg + '">' + settings.i18n.layouts.lg + '</a>'+
                        '<a class="dropdown-item" title="' + settings.i18n.layouts.md + '">' + settings.i18n.layouts.md + '</a>'+
                        '<a class="dropdown-item" title="' + settings.i18n.layouts.sm + '">' + settings.i18n.layouts.sm + '</a>'+
                        '<a class="dropdown-item" title="' + settings.i18n.layouts.xs + '">' + settings.i18n.layouts.xs + '</a>'+
                    '</div>' +
                '</div>')
                .on('click', 'a', function() {
                    var a = $(this);
                    switchLayout(a.index());
                    layoutDropdown.find('button').text(a.text());
                })
                .appendTo(wrapper)
            ;
            var btnGroup = $('<div class="btn-group pull-right"/>')
                .appendTo(wrapper)
            ;
            var htmlButton = $('<button title="' + settings.i18n.buttons.html + '" type="button" class="btn btn-sm btn-primary gm-edit-mode"><span class="fa-layers fa-fw"><i class="fas fa-chevron-left" data-fa-transform="left-6"></i><i class="fas fa-chevron-right" data-fa-transform="right-6"></i></span></button>')
                .on('click', function() {
                    if (htmlButton.hasClass('active')) {
                        canvas.empty().html(htmlTextArea.val()).show();
                        init();
                        htmlTextArea.hide();
                    } else {
                        deinit();
                        htmlTextArea
                            .height(0.8 * $(window).height())
                            .val(canvas.html())
                            .show()
                        ;
                        canvas.hide();
                    }

                    htmlButton.toggleClass('active btn-danger');
                })
                .appendTo(btnGroup)
            ;
            var previewButton = $('<button title="' + settings.i18n.buttons.preview + '" type="button" class="btn btn-sm btn-primary gm-preview"><i class="fas fa-eye fa-fw"></i></button>')
                .on('mouseenter', function() {
                    canvas.removeClass('ge-editing');
                })
                .on('click', function() {
                    previewButton.toggleClass('active btn-danger').trigger('mouseleave');
                })
                .on('mouseleave', function() {
                    if (!previewButton.hasClass('active')) {
                        canvas.addClass('ge-editing');
                    }
                })
                .appendTo(btnGroup)
            ;

            // Make controls fixed on scroll
            $(window).on('scroll', onScroll);

            /* Init RTE on click */
            canvas.on('click', '.ge-content', initRTE);
        }

        function onScroll(e) {
            var $window = $(window);

            if (
                $window.scrollTop() > mainControls.offset().top &&
                $window.scrollTop() < canvas.offset().top + canvas.height()
            ) {
                if (wrapper.hasClass('ge-top')) {
                    wrapper
                        .css({
                            left: wrapper.offset().left,
                            width: wrapper.outerWidth(),
                        })
                        .removeClass('ge-top')
                        .addClass('ge-fixed')
                    ;
                }
            } else {
                if (wrapper.hasClass('ge-fixed')) {
                    wrapper
                        .css({ left: '', width: '' })
                        .removeClass('ge-fixed')
                        .addClass('ge-top')
                    ;
                }
            }
        }

        function initRTE(e) {
            if ($(this).hasClass('ge-rte-active')) { return; }

            var rte = getRTE($(this).data('ge-content-type'));
            if (rte) {
                $(this).addClass('ge-rte-active', true);
                rte.init(settings, $(this));
            }
        }

        function reset() {
            deinit();
            init();
        }

        function init() {
            runFilter(true);
            canvas.addClass('ge-editing');
            addAllColClasses();
            wrapContent();
            createRowControls();
            createColControls();
            makeSortable();
            switchLayout(curColClassIndex);
        }

        function deinit() {
            canvas.removeClass('ge-editing');
            var contents = canvas.find('.ge-content').removeClass('ge-rte-active').each(function() {
                var content = $(this);
                getRTE(content.data('ge-content-type')).deinit(settings, content);
            });
            canvas.find('.ge-tools-drawer').remove();
            removeSortable();
            runFilter(false);
        }

        function remove() {
            deinit();
            mainControls.remove();
            htmlTextArea.remove();
            $(window).off('scroll', onScroll);
            canvas.off('click', '.ge-content', initRTE);
            canvas.removeData('grideditor');
        }

        function createRowControls() {
            canvas.find('.row').each(function() {
                var row = $(this);
                if (row.find('> .ge-tools-drawer').length) { return; }

                var drawer = $('<div class="ge-tools-drawer" />').prependTo(row);
                createTool(drawer, settings.i18n.tools.move, 'ge-move', 'fas fa-expand-arrows-alt fa-fw');
                createTool(drawer, settings.i18n.tools.settings, '', 'fas fa-cog fa-fw', function() {
                    details.toggle();
                });
                settings.row_tools.forEach(function(t) {
                    createTool(drawer, t.title || '', t.className || '', t.iconClass || 'fas fa-wrench fa-fw', t.on);
                });
                createTool(drawer, settings.i18n.tools.row.remove, '', 'fas fa-trash-alt fa-fw', function() {
                    if (window.confirm(settings.i18n.tools.row.confirm)) {
                        row.slideUp(function() {
                            row.remove();
                        });
                    }
                });
                createTool(drawer, settings.i18n.tools.col.add, 'ge-add-column', 'fas fa-plus-circle fa-fw', function() {
                    row.append(createColumn(3));
                    init();
                });

                var details = createDetails(row, settings.row_classes).appendTo(drawer);
            });
        }

        function createColControls() {
            canvas.find('.column').each(function() {
                var col = $(this);
                if (col.find('> .ge-tools-drawer').length) { return; }

                var drawer = $('<div class="ge-tools-drawer" />').prependTo(col);

                createTool(drawer, settings.i18n.tools.move, 'ge-move', 'fas fa-expand-arrows-alt fa-fw');

                createTool(drawer, settings.i18n.tools.size.decrease, 'ge-decrease-col-width', 'fas fa-minus fa-fw', function(e) {
                    var colSizes = settings.valid_col_sizes;
                    var curColClass = colClasses[curColClassIndex];
                    var curColSizeIndex = colSizes.indexOf(getColSize(col, curColClass));
                    var newSize = colSizes[clamp(curColSizeIndex - 1, 0, colSizes.length - 1)];
                    if (e.shiftKey) {
                        newSize = colSizes[0];
                    }
                    setColSize(col, curColClass, Math.max(newSize, 1));
                });

                createTool(drawer, settings.i18n.tools.size.increase, 'ge-increase-col-width', 'fas fa-plus fa-fw', function(e) {
                    var colSizes = settings.valid_col_sizes;
                    var curColClass = colClasses[curColClassIndex];
                    var curColSizeIndex = colSizes.indexOf(getColSize(col, curColClass));
                    var newColSizeIndex = clamp(curColSizeIndex + 1, 0, colSizes.length - 1);
                    var newSize = colSizes[newColSizeIndex];
                    if (e.shiftKey) {
                        newSize = getColSize(col, curColClass) + getColumnSpare(col.parent());
                    }
                    setColSize(col, curColClass, Math.min(newSize, MAX_COL_SIZE));
                });

                createTool(drawer, settings.i18n.tools.offset.decrease, 'ge-decrease-col-offset', 'fas fa-long-arrow-alt-left fa-fw', function(e) {
                    var curColClass = colClasses[curColClassIndex];
                    var curColSize = getColSize(col, curColClass);
                    var curColOffsetClass = offsetClasses[curColClassIndex];
                    var curColOffset = getColOffset(col, curColOffsetClass);
                    var newOffset = curColOffset;
                	if (curColSize > 0) {
                		newOffset = curColOffset - 1;
                        if (e.shiftKey) {
                        	newOffset = 0;
                        }
                	}
                	setColOffset(col, curColOffsetClass, Math.max(newOffset, 0));
                });

                createTool(drawer, settings.i18n.tools.offset.increase, 'ge-increase-col-offset', 'fas fa-long-arrow-alt-right fa-fw', function(e) {
                    var curColClass = colClasses[curColClassIndex];
                    var curColSize = getColSize(col, curColClass);
                    var curColOffsetClass = offsetClasses[curColClassIndex];
                    var curColOffset = getColOffset(col, curColOffsetClass);
                    var newOffset = curColOffset;
                	if (curColSize < MAX_COL_SIZE) {
                		newOffset = curColOffset + 1;
                        if (e.shiftKey) {
                        	newOffset = getColumnSpare(col.parent());
                        }
                	}
                    setColOffset(col, curColOffsetClass, Math.min(newOffset, MAX_COL_SIZE - 1));
                });

                createTool(drawer, settings.i18n.tools.settings, '', 'fas fa-cog fa-fw', function() {
                    details.toggle();
                });

                settings.col_tools.forEach(function(t) {
                    createTool(drawer, t.title || '', t.className || '', t.iconClass || 'fas fa-wrench fa-fw', t.on);
                });

                createTool(drawer, settings.i18n.tools.col.remove, '', 'fas fa-trash-alt fa-fw', function() {
                    if (window.confirm(settings.i18n.tools.col.confirm)) {
                        col.animate({
                            opacity: 'hide',
                            width: 'hide',
                            height: 'hide'
                        }, 400, function() {
                            col.remove();
                        });
                    }
                });

                createTool(drawer, settings.i18n.tools.row.add, 'ge-add-row', 'fas fa-plus-circle fa-fw', function() {
                    var row = createRow();
                    col.append(row);
                    row.append(createColumn(6)).append(createColumn(6));
                    init();
                });

                var details = createDetails(col, settings.col_classes).appendTo(drawer);
            });
        }

        function getColumnSpare(row) {
            return MAX_COL_SIZE - getColumnSizes(row);
        }

        function getColumnSizes(row) {
            var layout = colClasses[curColClassIndex];
            var size = 0;
            row.find('> [class*="'+layout+'"]').each(function(){
                size += getColSize($(this), layout);
            });
            return size;
        }

        function createTool(drawer, title, className, iconClass, eventHandlers) {
            var tool = $('<a title="' + title + '" class="' + className + '"><i class="' + iconClass + '"></i></a>')
                .appendTo(drawer)
            ;
            if (typeof eventHandlers == 'function') {
                tool.on('click', eventHandlers);
            }
            if (typeof eventHandlers == 'object') {
                $.each(eventHandlers, function(name, func) {
                    tool.on(name, func);
                });
            }
        }

        function createDetails(container, cssClasses) {
            var detailsDiv = $('<div class="ge-details" />');

            $('<input class="ge-id" />')
                .attr('placeholder', 'id')
                .val(container.attr('id'))
                .attr('title', settings.i18n.tools.setId)
                .appendTo(detailsDiv)
                .change(function() {
                    container.attr('id', this.value);
                })
            ;

            var classGroup = $('<div class="btn-group" />').appendTo(detailsDiv);
            cssClasses.forEach(function(rowClass) {
                var btn = $('<a class="btn btn-sm btn-default" />')
                    .html(rowClass.label)
                    .attr('title', rowClass.title ? rowClass.title : format(settings.i18n.tools.toggleClass, [rowClass.label]))
                    .toggleClass('active btn-primary', container.hasClass(rowClass.cssClass))
                    .on('click', function() {
                        btn.toggleClass('active btn-primary');
                        container.toggleClass(rowClass.cssClass, btn.hasClass('active'));
                    })
                    .appendTo(classGroup)
                ;
            });

            return detailsDiv;
        }

        function addAllColClasses() {
            canvas.find('.column, div[class*="col-"]').each(function() {
                var col = $(this);

                var size = 2;
                var sizes = getColSizes(col);
                if (sizes.length) {
                    size = sizes[0].size;
                }

                var elemClass = col.attr('class');
                colClasses.forEach(function(colClass) {
                    if (elemClass.indexOf(colClass) == -1) {
                        col.addClass(colClass + size);
                    }
                });

                col.addClass('column');
            });
        }

        /**
         * Return the column size for colClass, or a size from a different
         * class if it was not found.
         * Returns null if no size whatsoever was found.
         */
        function getColSize(col, colClass) {
            var sizes = getColSizes(col);
            for (var i = 0; i < sizes.length; i++) {
                if (sizes[i].colClass == colClass) {
                    return sizes[i].size;
                }
            }
            if (sizes.length) {
                return sizes[0].size;
            }
            return null;
        }

        function getColSizes(col) {
            var result = [];
            colClasses.forEach(function(colClass) {
                var re = new RegExp(colClass + '(\\d+)', 'i');
                if (re.test(col.attr('class'))) {
                    result.push({
                        colClass: colClass,
                        size: parseInt(re.exec(col.attr('class'))[1])
                    });
                }
            });
            return result;
        }

        function setColSize(col, colClass, size) {
            var re = new RegExp('(' + colClass + '(\\d+))', 'i');
            var reResult = re.exec(col.attr('class'));
            if (reResult && parseInt(reResult[2]) !== size) {
                col.switchClass(reResult[1], colClass + size, 50);
            } else {
                col.addClass(colClass + size);
            }
        }

        /**
         * Return the column offset for offsetClass, or a size from a different
         * class if it was not found.
         * Returns 0 if no offset whatsoever was found.
         */
        function getColOffset(col, offsetClass) {
            var sizes = getColOffsets(col);
            for (var i = 0; i < sizes.length; i++) {
                if (sizes[i].offsetClass == offsetClass) {
                    return sizes[i].size;
                }
            }
            if (sizes.length) {
                return sizes[0].size;
            }
            return 0;
        }

        function getColOffsets(col) {
            var result = [];
            offsetClasses.forEach(function(offsetClass) {
                var re = new RegExp(offsetClass + '(\\d+)', 'i');
                if (re.test(col.attr('class'))) {
                    result.push({
                    	offsetClass: offsetClass,
                        size: parseInt(re.exec(col.attr('class'))[1])
                    });
                }
            });
            return result;
        }

        function setColOffset(col, offsetClass, size) {
            var re = new RegExp('(' + offsetClass + '(\\d+))', 'i');
            var reResult = re.exec(col.attr('class'));
            /* if (reResult && size === 0) {
                col.removeClass(reResult[1]);
            } else  */if (reResult && parseInt(reResult[2]) !== size) {
                col.switchClass(reResult[1], offsetClass + size, 50);
            } else {
                col.addClass(offsetClass + size);
            }
        }

        function makeSortable() {
            canvas.find('.row').sortable({
                items: '> .column',
                connectWith: '.ge-canvas .row',
                handle: '> .ge-tools-drawer .ge-move',
                start: sortStart,
                tolerance: 'pointer',
                helper: 'clone',
            });
            canvas.add(canvas.find('.column')).sortable({
                items: '> .row, > .ge-content',
                connectsWith: '.ge-canvas, .ge-canvas .column',
                handle: '> .ge-tools-drawer .ge-move',
                start: sortStart,
                helper: 'clone',
            });

            function sortStart(e, ui) {
                ui.placeholder.css({ height: ui.item.outerHeight()});
            }
        }

        function removeSortable() {
            canvas.add(canvas.find('.column')).add(canvas.find('.row')).sortable('destroy');
        }

        function createRow() {
            return $('<div class="row" />');
        }

        function createColumn(size) {
            return $('<div/>')
                .addClass(colClasses.map(function(c) { return c + size; }).join(' '))
                .append(createDefaultContentWrapper().html(
                    getRTE(settings.content_types[0]).initialContent)
                )
            ;
        }

        /**
         * Run custom content filter on init and deinit
         */
        function runFilter(isInit) {
            if (settings.custom_filter.length) {
                $.each(settings.custom_filter, function(key, func) {
                    if (typeof func == 'string') {
                        func = window[func];
                    }

                    func(canvas, isInit);
                });
            }
        }

        /**
         * Wrap column content in <div class="ge-content"> where neccesary
         */
        function wrapContent() {
            canvas.find('.column').each(function() {
                var col = $(this);
                var contents = $();
                col.children().each(function() {
                    var child = $(this);
                    if (child.is('.row, .ge-tools-drawer, .ge-content')) {
                        doWrap(contents);
                    } else {
                        contents = contents.add(child);
                    }
                });
                doWrap(contents);
            });
        }
        function doWrap(contents) {
            if (contents.length) {
                var container = createDefaultContentWrapper().insertAfter(contents.last());
                contents.appendTo(container);
                contents = $();
            }
        }

        function createDefaultContentWrapper() {
            return $('<div/>')
                .addClass('ge-content ge-content-type-' + settings.content_types[0])
                .attr('data-ge-content-type', settings.content_types[0])
            ;
        }

        function switchLayout(colClassIndex) {
            curColClassIndex = colClassIndex;

            var layoutClasses = ['ge-layout-desktop-xl', 'ge-layout-desktop', 'ge-layout-tablet', 'ge-layout-phone-l', 'ge-layout-phone'];
            layoutClasses.forEach(function(cssClass, i) {
                canvas.toggleClass(cssClass, i == colClassIndex);
            });
        }

        function getRTE(type) {
            return $.fn.gridEditor.RTEs[type];
        }

        function clamp(input, min, max) {
            return Math.min(max, Math.max(min, input));
        }

        function format(source, params) {
            $.each(params, function (i, n) {
                source = source.replace(new RegExp("\\{" + i + "\\}", "g"), n);
            })
            return source;
        }

        baseElem.data('grideditor', {
            init: init,
            deinit: deinit,
            remove: remove,
        });

    });

    return self;

};

$.fn.gridEditor.RTEs = {};

})( jQuery );
