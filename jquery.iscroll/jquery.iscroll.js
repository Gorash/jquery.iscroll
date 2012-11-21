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
* @params:
* . {object}
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
* . . . template
*			{HTML STRING}
*			If you want to use a custom template with your scrollbar css
*
* @trigger event :
* . iscroll:start
* . iscroll:move
* . iscroll:stop
* . iscroll:mouseenter
* . iscroll:mouseleave
*		{event}
* . . . . . scrollpercent
*				{FLOAT} [0,1]
*				related scrolling
* . . . . . viewpercent
*				{FLOAT} [0,1]
*				related client height size
* . . . . . axis
*				{CHAR} [x | y]
*				actually only 'y' axe of scrolling
* . . . . . datas
*				{ARRAY}
*				list of item loaded by selector with a scrolltoppercent js attribute
* .	. . . . srcEvent
*				{OBJECT}
*				return the source event object (mousedown, click, resize...)
*				{event object}
* .	. . . . deltaY
*				{INT} [-1, 1]
*				direction of the movement
* .	. . . . deltaX
*				{INT} [-1, 1]
*				direction of the movement
* .	. . . . DOM
*				{OBJECT}
*				DOM element of the box
* . iscroll:message
*		The function must return the message to display, if false don't display the popup on the scrollbar.
*		{event}
* . . . . . scrollpercent
* . . . . . viewpercent
* . . . . . axis
* . . . . . datas
* . . . . . srcEvent
* .	. . . . DOM
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
		,	template	: 
				'<div class="iscroll">'+
					'<div class="iscroll-box">'+
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
					'</div>'+
				'</div>'
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
				$el.find('.iscroll-y').remove();
			}
			
			var scrollY = $(options.template);
			scrollY.addClass('iscroll-y').attr('data-axis', 'y');
			var scrollBox = scrollY.find('.iscroll-box');
			var scrollOverflowY = scrollBox.find('.iscroll-overflow');
			var scrollBarY = scrollBox.find('.iscroll-overflow-bar');
			var popupY = scrollBox.find('.iscroll-popup');
			var scrollcacheY = scrollBox.find('.iscroll-overflow-cache');
			scrollY.prependTo($el);
			
			var focus = false;
			var size = {};
		
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
				$el.css({'overflow': 'auto'});
				scrollBox.css("height", false);

				var heights = [$el.height(), el.clientHeight, el.offsetHeight];
				var height = Math.min.apply(null, heights);
				
				size.scrollHeight = el.scrollHeight+0;
				size.arrowHeight = scrollBox ? scrollBox.find('.iscroll-arrow-first').height() : 0
				
				$el.css('overflow', "hidden");
				scrollBox.css("height", height+"px");
				scrollOverflowY.css("height", (height-2*size.arrowHeight)+"px");
				
				var barHeight = height * (height/size.scrollHeight);
				if (barHeight < 10) barHeight = 10;
				scrollBarY.css("height", barHeight+"px");
				scrollcacheY.css("height", barHeight+"px");
				
				size.barHeight = barHeight;
				size.overflowRestHeight = (height-2*size.arrowHeight) - scrollBarY.outerHeight();
				size.scrollMaxY = size.scrollHeight - el.clientHeight;
				
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
				
				if(makeE[1]) {
					makeE[4] = true;
				}
				
				var data = {
					scrollpercent: el.scrollTop/size.scrollMaxY,
					viewpercent: el.clientHeight/size.scrollMaxY, 
					axis: Event.axis,
					datas: data || datasSelected,
					srcEvent: event,
					DOM: el,
					deltaY: event && event.deltaY ? (event.deltaY > 0 ? 1 : -1) : 0,
					deltaX: event && event.deltaX ? (event.deltaX > 0 ? 1 : -1) : 0
				};
				
				for(var e in events) {
					if (makeE[e] || events[e] == type) {
						data.type = events[e];
						trigger(events[e], data);
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
				datasSelected = [];
				var boxPositionTop = $el.position().top;
				$el.find(options.selector).each(function(){
					datasSelected.push({'DOM':this, 'scrollpercent': ($(this).position().top - boxPositionTop) / size.scrollHeight });
				});
				datasSelected.sort(function(a,b){
					return a.scrollpercent - b.scrollpercent
				});
				return datasSelected;
			}
			
			function on_popup(e, data) {
				// get if the event for message are is bound
				if (!hasBindEvent('message')) {
					return false;
				}
				
				var axis = (Event.axis || getAxis(e));
				if (axis == 'y') {

					var top = e.clientY - scrollBox.position().top - scrollY.position().top - size.arrowHeight;
					
					var scroll = top / (scrollBox.height() - size.arrowHeight*2);
					
					var datas = data && data.datas || datasSelected;
					
					var span = popupY.find('span:first');
					
					var data = {
						scrollpercent: scroll,
						viewpercent: el.clientHeight/size.scrollMaxY, 
						axis: Event.axis,
						datas: datas,
						srcEvent: e,
						DOM: el
					};
					
					var message = trigger('message', data);
					
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
						left: '-'+scrollBox.css('left'),
						width: el.clientWidth+'px',
						height: (scrollBarY.height()+50)+'px',
					});
				} else {
					scrollcacheY.css({top:'', left:'', width: '100%', height: '100%'});
				}
			}
			
			function gotoscrollBox(y, e) {
				el.scrollTop = parseInt(y) < size.scrollMaxY ? y : size.scrollMaxY;
				resetBarPosition();
			}
			function resetBarPosition() {
				scrollBox.css('top', el.scrollTop+'px');
			}
			function moveBarY(top) {
				if (top < 0){
					top = 0;
				} else if (top > size.overflowRestHeight){
					top = size.overflowRestHeight;
				}
				scrollBarY.css('top', top+'px');
				return top/size.overflowRestHeight;
			}
			function resetScrollPosition() {
				moveBarY( (el.scrollTop/size.scrollMaxY) * size.overflowRestHeight );
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
					(e.deltaY < 0 && el.scrollTop >= size.scrollHeight - el.clientHeight)) {
					return false;
				}
				var delta = (options.invertscroll ? -1 : 1) * (e.deltaY > 0 ? -1 : 1) * (h && !isNaN(h) ? h : options.wheel);
				
				gotoscrollBox(el.scrollTop + delta, e);
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
					gotoscrollBox( ratio * size.scrollMaxY , e);
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
				var top = (e.offsetY || e.originalEvent.layerY || window.event.offsetY || window.event.layerY) - size.barHeight/2;
				
				var ratio = moveBarY(top);
				
				gotoscrollBox( ratio * size.scrollMaxY , e);
				Event.axis = getAxis(e);
				callback('goto', e);
				Event.axis = false;
			}
			function resize(e) {
				if ($el.height() != scrollBox.height()) {
					resizeScroll(e);
					resetBarPosition(e);
					resetScrollPosition(e);
					callback('resize', e);
				} else if(e && e.type == 'DOMNodeInserted' && !$(e.relatedNode).parents('.iscroll').size()) {
					reloadDatas(e);
				}
			}
			
			function key(e) {
				if (!focus || (e.keyCode != 33 && e.keyCode != 34 && e.keyCode != 38 && e.keyCode != 40)) {
					return true;
				}
				
				if ( Event.axis || 
					((e.keyCode == 33 || e.keyCode == 38 ) && el.scrollTop <= 0) || 
					((e.keyCode == 34 || e.keyCode == 40 ) && el.scrollTop >= size.scrollHeight - el.clientHeight)) {
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
				
				
				scrollBox.find('.iscroll-arrow-first').bind( 'mousedown', function(e){
					e.stopPropagation();
					window.clearInterval(activearrow);
					activearrow = window.setInterval(function () {arrow(e)}, 50);
				});
				scrollBox.find('.iscroll-arrow-first').bind( 'mouseup', function(e){
					window.clearInterval(activearrow);
				});
				scrollBox.find('.iscroll-arrow-last').bind( 'mousedown', function(e){
					e.stopPropagation();
					window.clearInterval(activearrow);
					activearrow = window.setInterval(function () {arrow(e)}, 50);
				});
				scrollBox.find('.iscroll-arrow-last').bind( 'mouseup', function(e){
					window.clearInterval(activearrow);
				});
				
				
				$el.parent().resize(resize);
				$el.bind('resize DOMNodeInserted', resize);
				window.setTimeout(resize, 250);
				$el.bind('iscroll:reload', init);
				
				scrollBox.bind('selectstart', function(e){e.stopPropagation();return false});
				scrollBox.bind('selectstart', '*', function(e){e.stopPropagation();return false});
			}
			function init(e) {
				resizeScroll(e);
				reloadDatas(e);
				resetBarPosition(e);
				resetScrollPosition(e);
			}
			
			init();
			setEvents();
			
		})(this, options);
	});

	return this;
};

})(window,jQuery);
