/*
* jquery.iscroll.js
* MIT licensed
* Christophe Matthieu
* tof.matthieu@gmail.com
* If you use this software, please send me an email.
*/
(function(window,$) {
/* intelligent scrolling
* trigger event with return value like callback => iscroll:start ; iscroll:move ; iscroll:stop ; iscroll:mouseenter ; iscroll:mouseleave
* trigger event for return a message to display : iscroll:message
*
* @params {object}
* .	. . axis
*			{STRING} [x | y]
*			vertical or horizontal scrollbar? actually only "y".
* .	. . wheel
*			{INT}
*			how many pixels must the arrow and mouswheel scroll at a time.
* .	. . pagedown
*			{INT}
*			how many pixels must the pagedown scroll at a time.
* .	. . invertscroll
*			{BOOLEAN}
*			Enable mobile invert style scrolling
* .	. . selector
*			{STRING}
*			selector for the list of items loaded and used by message and callback (scrollrate)
* .	. . callback
*			{FUNCTION}
*			function called on scroll move
*			this = DOM element of the box
* .	. . . . type
*				{STRING} [start | move | stop]
* . . . . . scroll
*				{FLOAT} [0,1]
*				related scrolling
* . . . . . view
*				{FLOAT} [0,1]
*				related client height size
* . . . . . axis
*				{CHAR} [x | y]
*				actually only 'y' axe of scrolling
* . . . . . datas
*				{ARRAY}
*				list of item loaded by selector with a scrollrate attribute
*				(center clientHeight = 0, border top client box = -1, border bottom client box = 1)
* .	. . . . srcEvent
*				{OBJECT}
*				return the source event object (mousedown, click, resize...)
*				{event object}
* .	. . . . deltaY
*				{INT} [-1, 1]
*				direction of the move (when move event)
* .	. . . . deltaX
*				{INT} [-1, 1]
*				direction of the move (when move event)
* .	. . message
*			{FUNCTION}
*			function called for display message on the scroll bar
*			this = DOM element of the message content
* . . . . . scroll
*				{FLOAT} [0,1]
*				related scrolling
* . . . . . datas
*				{ARRAY}
*				list of item loaded by selector with a scrollrate attribute
*				(center client = 0, border top = -1, border bottom = 1)
*/
$.fn.iScroll = function (options, callback) {
	
	if (typeof options == 'function') {
		var options= {callback: options};
	} else {
		options.callback = callback || options.callback;
	}
	
	var options = $.extend( {
			axis        : 'y' 
		,   wheel     	: 40
		,   pagedown    : false
		,   selector    : false
		,   invertscroll: false
		,	callback	: function () {}
	}, options );
	
	this.each( function(){
		(function (el, options) {
			switch (el.tagName.toLowerCase()) {
				case 'select':
				case 'textarea':
				case 'input':
					throw new TypeError("Invalid type :"+el.tagName+".");
					return false;
			}
			
			var $el = $(el);
			if ($el.find('.iscroll-y').size()) {
				return false;
			}
			
			var scrollY = $(
				'<div class="iscroll iscroll-y" data-axis="y">'+
					'<div class="iscroll-popup">'+
						'<div class="iscroll-popup-box">'+
							'<div class="iscroll-popup-arrow">x</div>'+
							'<span>.</span>'+
						'</div>'+
					'</div>'+
					'<span class="iscroll-arrow-first">D</span>'+
					'<div class="iscroll-overflow">'+
						'<div class="iscroll-overflow-bar" style="top: 0;">'+
							'<button/>'+
							'<div class="iscroll-overflow-cache"></div>'+
						'</div>'+
					'</div>'+
					'<span class="iscroll-arrow-last">A</span>'+
				'</div>');
			var scrollOverflowY = scrollY.find('.iscroll-overflow');
			var scrollBarY = scrollY.find('.iscroll-overflow-bar');
			var popupY = scrollY.find('.iscroll-popup');
			var scrollcacheY = scrollY.find('.iscroll-overflow-cache');
			scrollY.prependTo($el);
			
			var focus = false;
			var size = {
				arrow : {
					h : scrollY ? scrollY.find('.iscroll-arrow-first').height() : 0
				}
			};
		
			var Event = {
				pos: {
					y: false,
					x: false
				},
				start: {
					y: false,
					x: false
				},
				now: {
					y: false,
					x: false
				},
				axis: false,
			};
			
			function resizeScroll(e) {
				$el.css({'overflow': ''});
				scrollY.css("height", false);
				
				var heights = [$el.height(), el.clientHeight, el.offsetHeight];
				var height = Math.min.apply(null, heights);
				
				$el.css('overflow', "hidden");
				scrollY.css("height", height+"px");
				scrollOverflowY.css("height", (height-2*size.arrow.h)+"px");
				
				var barHeight = height * (height/el.scrollHeight);
				if (barHeight < 10) barHeight = 10;
				scrollBarY.css("height", barHeight+"px");
				scrollcacheY.css("height", barHeight+"px");
				
				size.bar = {
					h : barHeight
				};
				size.inner = {
					h : height-2*size.arrow.h-scrollBarY.outerHeight()-1
				};
				size.box = {
					h : el.scrollHeight - el.clientHeight
				};
				
				if (!options.pagedown) {
					options.pagedown = height-20;
				}
				
				callback('resize', e);
			}
			
			function getAxis(e) {
				return e.currentTarget.getAttribute('data-axis') || $(e.currentTarget).parents('[data-axis]:first').attr('data-axis');
			}
			
			var unactiveCallback = false;
			function callback(type, event, data) {
				var events = ['start', 'move', 'stop', 'mouseenter', 'mousemove', 'mouseleave'];
				var makeE = [];
				
				if (type == 'scroll') {
					if (!unactiveCallback) {
						makeE[0] = true;
					}
					makeE[1] = true;
					window.clearTimeout(unactiveCallback);
					unactiveCallback = window.setTimeout(function () {
						unactiveCallback = false;
						callback('stop', event);
					}, 75);
				} else if (type == 'goto' || type == 'resize') {
					makeE[0] = true;
					makeE[1] = true;
					makeE[2] = true;
				}
				
				if(makeE[0]) {
					reloadDatas();
				}
				if(makeE[1]) {
					makeE[4] = true;
				}
				
				var data = {
					scroll: el.scrollTop/size.box.h,
					view: el.clientHeight/size.box.h, 
					axis: Event.axis,
					datas: data || getDatasScroll(el.scrollTop/size.box.h).get(),
					srcEvent: event
				};
				
				for(var e in events) {
					if (makeE[e] || events[e] == type) {
						data.type = events[e];
						if (e==1) {
							data.deltaY= event && event.deltaY ? (event.deltaY > 0 ? 1 : -1) : 0,
							data.deltaX= event && event.deltaX ? (event.deltaX > 0 ? 1 : -1) : 0
						} else {
							delete data.deltaY;
							delete data.deltaX;
						}
						trigger(events[e], data);
						options.callback.apply(el, [data]);
					}
				}
				
				return data;
			}
			
			function trigger(type, data){
				var e = $.Event('iscroll:'+type);
				for (var k in data) {
					if (k != 'type') {
						$.event.props.push(k);
						e[k] = data[k];
					}
				}
				return $el.triggerHandler(e);
			}
			function hasBindEvent(type) {
				var events = $el.data("events");
				return events && events['iscroll:'+type];
			}
			
			var datasSelected = [];
			function reloadDatas () {
				datasSelected = $el.find(options.selector);
				var boxPositionTop = $el.position().top;
				datasSelected.each(function(){
					this.scrolltop = $(this).position().top + el.scrollTop - boxPositionTop;
				});
			}
			function getDatasScroll (ratio) {
				if (!options.selector) {
					return false;
				}
				var scrollTop = ratio * size.box.h;
				
				var middle = el.clientHeight/2;
				datasSelected.each(function () {
					var scrollrate = ((this.scrolltop - scrollTop - middle)/middle);
					this.scrollrate;
					this.setAttribute('scrollrate', scrollrate );
				});
				
				return datasSelected;
			}
			
			function on_popup(e, data) {
				// get if the are a bind event for message or a callback message
				if (!hasBindEvent('message') && !options.message) {
					return false;
				}
				
				var axis = (Event.axis || getAxis(e));
				if (axis == 'y') {
					
					var top = e.clientY - scrollY.position().top - size.bar.h/2 - size.arrow.h;
					
					var span = popupY.find('span:first');
					var scroll = moveBarY(top, true);
					
					var datas = data && data.datas || getDatasScroll(scroll).get();
					
					if (hasBindEvent('message')) {
						var message = trigger('message', {scroll:scroll, datas:datas });
					} else if (options.message) {
						var message = options.message.apply(span, [{scroll:scroll, datas:datas }]);
					}
					
					if (message && message.length) {
						popupY.show().css('top', '+'+top+'px');
						span.html( message );
					} else {
						off_popup();
					}
				}
				return datas;
			}
			function off_popup() {
				popupY.removeAttr('style');
			}
			function cache() {
				if (Event.axis) {
					scrollcacheY.css({
						top: '-25px',
						left: '-'+scrollY.css('left'),
						width: el.clientWidth+'px',
						height: (scrollBarY.height()+50)+'px',
					});
				} else {
					scrollcacheY.css({top:'', left:'', width: '100%', height: '100%'});
				}
			}
			
			function gotoScrollY(y, e) {
				el.scrollTop = parseInt(y) < size.box.h ? y : size.box.h;
				resetBarPosition();
			}
			function resetBarPosition() {
				scrollY.css('top', el.scrollTop+'px');
			}
			function moveBarY(top, stay) {
				if (top < 0){
					top = 0;
				} else if (top > size.inner.h){
					top = size.inner.h;
				}
				if(!stay) scrollBarY.css('top', top+'px');
				return top/size.inner.h;
			}
			function resetScrollPosition() {
				moveBarY( (el.scrollTop/size.box.h) * size.inner.h );
			}
			
			
			function wheelDirection(event) {
				var oe = event && event.originalEvent || window.event || event,
					event = $.event.fix(oe),
					delta = 0,
					deltaY = 0,
					deltaX = 0;
				
				if ( !delta && oe.wheelDelta ) { deltaY = delta = oe.wheelDelta/120; }
				if ( !delta && oe.detail ) { deltaY = delta = -oe.detail/3; }
				if ( oe.axis !== undefined && oe.axis === oe.HORIZONTAL_AXIS ) {
					deltaY = 0;
					deltaX = -1*delta;
				}
				if ( !deltaY && oe.wheelDeltaY ) { deltaY = oe.wheelDeltaY/120; }
				if ( !deltaX && oe.wheelDeltaX ) { deltaX = -1*oe.wheelDeltaX/120; }
				
				event.deltaX = deltaX;
				event.deltaY = deltaY;
				
				return event;
			}
			function wheel(e, h, cb) {
				if (!h && !cb) var e = wheelDirection(e);
				
				if (!e.deltaY || Event.axis || 
					(e.deltaY > 0 && el.scrollTop <= 0) || 
					(e.deltaY < 0 && el.scrollTop >= el.scrollHeight - el.clientHeight)) {
					return false;
				}
				var delta = (options.invertscroll ? -1 : 1) * (e.deltaY > 0 ? -1 : 1) * (h && !isNaN(h) ? h : options.wheel);
				
				gotoScrollY(el.scrollTop + delta, e);
				callback(cb ? cb : 'scroll', e);
				
				Event.pos.y = 0;
				Event.pos.x = 0;
				resetScrollPosition();
				
				return false;
			}
			function start(e) {
				e.stopPropagation();
				
				Event.pos.y = parseInt(scrollBarY.css('top'));
				Event.start.y = Event.now.y = e.pageY;
				Event.axis = getAxis(e);
				
				cache();
				callback('start', e);
				
				return false;
			}
			function stop(e) {
				e.stopPropagation();
				if (Event.axis == getAxis(e)) {
					callback('stop', e);
					Event.pos.y = 0;
					Event.pos.x = 0;
					Event.axis = false;
					Event.now.y = false;
				}
				cache();
				off_popup();
			}
			function drag(e) {
				e.stopPropagation();
				if (Event.axis) {
					e.deltaY = Event.now.y - e.pageY;
					Event.now.y = e.pageY;
					var ratio = moveBarY(e.pageY - Event.start.y + Event.pos.y);
					gotoScrollY( ratio * size.box.h , e);
					cache();
					var data = callback('move', e);
					on_popup(e, data);
				} else {
					on_popup(e, data);
				}
			}
			function goTo(e) {
				if (e.which != 1) return;
				e.deltaY = e.pageY - scrollBarY.position().top;
				var top = e.clientY - scrollY.position().top - size.bar.h/2 - size.arrow.h;
				var ratio = moveBarY(top);
				gotoScrollY( ratio * size.box.h , e);
				Event.axis = getAxis(e);
				callback('goto', e);
				Event.axis = false;
			}
			function resize(e) {
				init();
				callback('resize', e);
			}
			
			function key(e) {
				if (!focus || (e.keyCode != 33 && e.keyCode != 34 && e.keyCode != 38 && e.keyCode != 40)) {
					return true;
				}
				
				if ( Event.axis || 
					((e.keyCode == 33 || e.keyCode == 38 ) && el.scrollTop <= 0) || 
					((e.keyCode == 34 || e.keyCode == 40 ) && el.scrollTop >= el.scrollHeight - el.clientHeight)) {
					if (focus !== true) {
						callback('stop', e);
					}
					focus = true;
					return false;
				}
				
				if (focus !== 'start' && focus !== 'move') {
					focus = 'start';
				} else {
					focus = 'move';
				}
				
				switch (e.keyCode) {
					case 33: e.deltaY= 1; wheel(e, options.pagedown, focus); break;
					case 34: e.deltaY= -1; wheel(e, options.pagedown, focus); break;
					case 38: e.deltaY= 1; wheel(e, false, focus); break;
					case 40: e.deltaY= -1; wheel(e, false, focus); break;
				}
			}
			var activearrow = false;
			function arrow(e) {
				if(e.delegateTarget.getAttribute('class') == 'iscroll-arrow-first') {
					e.deltaY = 1;
				} else {
					e.deltaY = -1;
				}
				wheel(e, 20);
			}
			
			function setEvents() {
				scrollcacheY
					.bind( 'mousedown', start )
					.bind( 'mousemove', drag )
					.bind( 'mouseup', stop );
				
				scrollOverflowY
					.bind( 'mousedown', goTo )
					.bind( 'mousemove', drag )
					.bind( 'mouseleave', stop )
					.bind( 'mouseenter', function (e) {callback('mouseenter',e);} )
					.bind( 'mouseleave', function (e) {callback('mouseleave',e);} )
					.bind( 'mouseup', stop );
				
				$el.bind( 'mousewheel DOMMouseScroll', wheel );
				
				$(window).bind( 'mousedown', function (e) {
					if (e.target == el || $.contains(el, e.target)) {
						focus = true;
					} else if(focus === true) {
						focus = false;
					}
					return true;
				});
				$(window).bind( 'keydown', key);
				$(window).bind( 'keyup', function (e) {
					if (!focus) return true;
					if(focus !== true) {
						focus = true;
						callback('stop', e);
					}
				});
				
				
				scrollY.find('.iscroll-arrow-first').bind( 'mousedown', function(e){
					e.stopPropagation();
					window.clearInterval(activearrow);
					activearrow = window.setInterval(function () {arrow(e)}, 50);
				});
				scrollY.find('.iscroll-arrow-first').bind( 'mouseup', function(e){
					window.clearInterval(activearrow);
				});
				scrollY.find('.iscroll-arrow-last').bind( 'mousedown', function(e){
					e.stopPropagation();
					window.clearInterval(activearrow);
					activearrow = window.setInterval(function () {arrow(e)}, 50);
				});
				scrollY.find('.iscroll-arrow-last').bind( 'mouseup', function(e){
					window.clearInterval(activearrow);
				});
				
				
				$el.resize(resize);
				$el.parent().resize(resize);
				
				scrollY.bind('selectstart', function(e){e.stopPropagation();return false});
				scrollY.bind('selectstart', '*', function(e){e.stopPropagation();return false});
			}
			function init(e) {
				resizeScroll(e);
				resetBarPosition(e);
				resetScrollPosition(e);
			}
			
			init();
			setEvents();
			
		})(this, options);
	});

	return $(this);
};

})(window,jQuery);