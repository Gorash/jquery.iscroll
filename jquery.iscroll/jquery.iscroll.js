/*
* jquery.iscroll.js
* MIT licensed
* Christophe Matthieu
* tof.matthieu@gmail.com
* If you use self software, please send me an email.
*/
(function(window,$) {
/* intelligent scrolling
*
* Options:
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
* . . . message
*			{FUNCTION}
*			The function must return the message to display, if false don't display the popup on the scrollbar.
*			Receive @params
* . . . start
*			{FUNCTION}
*			callback function
*			Receive @params
* . . . move
*			{FUNCTION}
*			callback function
*			Receive @params
* . . . stop
*			{FUNCTION}
*			callback function
*			Receive @params
* . . . callback
*			{FUNCTION}
*			callback function for all event : start, move, stop
*			Receive @params
*
*	@params
* . . . . . $el
*				{OBJECT jQuery}
*				initial box
* . . . . . $iscroll 
*				{OBJECT jQuery}
*				iscroll content
* . . . . . $iscrollbox 
*				{OBJECT jQuery}
* . . . . . $iscrolloverflow 
*				{OBJECT jQuery}
* . . . . . $iscrollbar 
*				{OBJECT jQuery}
* . . . . . $iscrollpopup 
*				{OBJECT jQuery}
* . . . . . $iscrollcache 
*				{OBJECT jQuery}
* . . . . . $iscrollarrowfirst
*				{OBJECT jQuery}
* . . . . . $iscrollarrowlast
*				{OBJECT jQuery}
* . . . . . scrollpercent
*				{FLOAT} [0,1]
*				related scrolling
* . . . . . viewpercent
*				{FLOAT} [0,1]
*				related client height self[2].size
* . . . . . axis
*				{CHAR} [x | y]
*				actually only 'y' axe of scrolling
* . . . . . datas
*				{ARRAY}
*				list of item loaded by selector with a scrolltoppercent js attribute
* .	. . . . event
*				{OBJECT}
*				return the source event object (mousedown, click, resize...)
*				{event object}
* .	. . . . type
				{STRING}
* .	. . . . deltaY
*				{INT} [-1, 1]
*				direction of the movement
* .	. . . . deltaX
*				{INT} [-1, 1]
*				direction of the movement
*/
$.fn.iScroll = function (options) {
	
	this.each( function(i, item){
		$.fn.iScroll._constructor(item, options);
	});

	return this;
};

var i = {
	_constructor: function (item, options) {
		// verification of tag name
		switch (item.tagName.toLowerCase()) {
			case 'select':
			case 'textarea':
			case 'input':
				throw new TypeError("Invalid type :"+self[0].tagName+".");
				return false;
		}
		
		// set default value for options
		var options = $.fn.iScroll.setDefaultOptions(self, options);
		
		// pre-init self
		var self = [item, {
			$el : $(item),
			$iscroll : $(options.template)
		}, {}];
		
		// remove DOM and event
		$.fn.iScroll.remove(self, options);
		
		// create DOM
		self[1].$iscroll.prependTo(self[1].$el);
		self[1].$iscroll.addClass('iscroll-y').attr('data-axis', 'y');
		
		// init and event
		$.fn.iScroll.init(self, options);
		$.fn.iScroll.setEvents(self);
	},
	remove: function (self) {
		var dispatch = $.fn.iScroll.dispatchEvent;
		
		self[1].$el.find('.iscroll-y').remove();
		
		$(window)
			.unbind( 'mousedown', function (event) {dispatch(self, 'eventMousedown', event)} )
			.unbind( 'mouseup', function (event) {dispatch(self, 'eventStop', event)} )
			.unbind( 'keydown', function (event) {dispatch(self, 'eventKey', event)} )
			.unbind( 'keyup', function (event) {dispatch(self, 'eventKeyup', event)} );
		
		self[1].$el
			.unbind('resize DOMNodeInserted', function (event) {dispatch(self, 'eventResize', event)})
			.unbind( 'mousewheel DOMMouseScroll', function (event) {dispatch(self, 'eventWheel', event); return false;} )
			.unbind('iscroll:reload', function (event) {dispatch(self, 'init', event)});
		
		self[1].$el.parent()
			.unbind('resize', function (event) {dispatch(self, 'eventResize', event)});
	},
	init : function (self, options) {
		// outside value
		self[1] = {
			$el :				self[1].$el,
			$iscroll : 			self[1].$iscroll,
			$iscrollbox : 		self[1].$iscroll.find('.iscroll-box'),
			$iscrolloverflow : 	self[1].$iscroll.find('.iscroll-overflow'),
			$iscrollbar : 		self[1].$iscroll.find('.iscroll-overflow-bar'),
			$iscrollpopup : 	self[1].$iscroll.find('.iscroll-popup'),
			$iscrollcache : 	self[1].$iscroll.find('.iscroll-overflow-cache'),
			$iscrollarrowfirst:	self[1].$iscroll.find('.iscroll-arrow-first'),
			$iscrollarrowlast: 	self[1].$iscroll.find('.iscroll-arrow-last'),
			// axis x or y
			axis: false,
			// datas of selector
			datas: false,
			event: false
		};
		
		// internal value
		self[2] = {
			event : {
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
				}
			},
			focus: false,
			size: {},
			unactiveCallback: false,
			options:		options,
			activearrow:	false,
			message: 		options.message,
			start: 			options.start,
			move: 			options.move,
			stop: 			options.stop,
			callback: 		options.callback,
		};
		
		$.fn.iScroll.resizeBar(self);
		$.fn.iScroll.setDatas(self);
		$.fn.iScroll.resetBarPosition(self);
		$.fn.iScroll.resetScrollPosition(self);
		
		return self;
	},
	setDefaultOptions : function (self, options) {
		return $.extend( {
				axis        : 	'y' 
			,   wheel     	: 	40
			,   pagedown    : 	false
			,   selector    : 	false
			,   invertscroll: 	false
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
			,	message: 	false
			,	start : 	false
			,	move : 		false
			,	stop : 		false
			,	mouseenter: false
			,	mouseleave: false
		}, options );
	},
	resizeBar : function (self) {
		var size = self[2].size;
		
		// pre-set css for record size
		self[1].$el.css({'overflow': 'auto'});
		self[1].$iscrollbox.css("height", false);
		
		// record size
		size.boxHeight = Math.min.apply(null, [self[1].$el.height(), self[0].clientHeight, self[0].offsetHeight]);
		size.scrollHeight = +self[0].scrollHeight;
		size.arrowHeight = +self[1].$iscrollarrowfirst.height();
		size.overflowHeight = size.boxHeight - 2*size.arrowHeight;
		size.scrollMaxY = size.scrollHeight - self[0].clientHeight;
		if (!self[2].options.pagedown) {
			self[2].options.pagedown = size.boxHeight-20;
		}
		var barHeight = size.boxHeight * (size.boxHeight/size.scrollHeight);
		size.barHeight = (+barHeight > 10 ? +barHeight : 10);
		size.overflowRestHeight = size.overflowHeight - size.barHeight
			- 2* parseInt(self[1].$iscrollarrowfirst.css('borderBottomWidth'))
			- 2* parseInt(self[1].$iscrollarrowfirst.css('borderTopWidth'));
		
		// set css
		self[1].$el.css('overflow', "hidden");
		self[1].$iscrollbox.css("height", size.boxHeight+"px");
		self[1].$iscrolloverflow.css("height", size.overflowHeight+"px");
		self[1].$iscrollbar.css("height", size.barHeight+"px");
		self[1].$iscrollcache.css("height", size.barHeight+"px");
		
		$.fn.iScroll.callback(self, 'resize');
	},
	callback : function (self, type) {
		var events = ['start', 'move', 'stop'];
		var makeE = [];
		
		if (type == 'scroll') {
			if (!self[2].unactiveCallback) {
				makeE[0] = true;
			}
			makeE[1] = true;
			window.clearTimeout(self[2].unactiveCallback);
			self[2].unactiveCallback = window.setTimeout(function () {
				self[2].unactiveCallback = false;
				$.fn.iScroll.callback(self, 'stop');
			}, 75);
		} else if (type == 'goto' || type == 'resize') {
			makeE[0] = true;
			makeE[1] = true;
			makeE[2] = true;
		}
		
		self[1] = $.extend(self[1], {
			scrollpercent: 		self[0].scrollTop/self[2].size.scrollMaxY,
			viewpercent: 		self[0].clientHeight/self[2].size.scrollMaxY,
			DOM: 				self,
			deltaY: 			self[1].event && self[1].event.deltaY ? (self[1].event.deltaY > 0 ? 1 : -1) : 0,
			deltaX: 			self[1].event && self[1].event.deltaX ? (self[1].event.deltaX > 0 ? 1 : -1) : 0
		});
		
		for(var e in events) {
			if (makeE[e] || events[e] == type) {
				self[1].type = events[e];
				if (self[2][self[1].type]) {
					self[2][self[1].type](self[0], [self[1]]);
				}
				if (self[2].callback) {
					self[2].callback.apply(self[0], [self[1]]);
				}
			}
		}
	},
	getAxis : function (self) {
		return self[1].event.currentTarget.getAttribute('data-axis') || 
			$(self[1].event.currentTarget).parents('[data-axis]:first').attr('data-axis');
	},
	setDatas : function (self) {
		// firefox set initial position
		var $last = self[1].$el.find(':last');
		var delta = +$last.position().top;
		var scrollTop = +self[0].scrollTop;
		self[0].scrollTop = 0;
		delta -= $last.position().top;
		self[0].scrollTop = scrollTop;
		// end
		
		var boxPositionTop = self[1].$el.position().top + delta;
		var scrollHeight = self[2].size.scrollHeight;
		
		self[1].datas = [];
		self[1].$el.find(self[2].options.selector).each(function(){
			self[1].datas.push([this, ($(this).position().top - boxPositionTop) / scrollHeight]);
		});
		self[1].datas.sort(function(a,b){
			return a[1] - b[1]
		});
	},
	on_popup : function (self, axis) {
		if (!self[2].message) {
			return false;
		}
		
		if (self[1].axis == 'y') {

			var top = self[1].event.clientY - self[1].$iscrollbox.position().top - self[1].$iscroll.position().top - self[2].size.arrowHeight;
			
			var span = self[1].$iscrollpopup.find('span:first');
			
			self[1] = $.extend(self[1], {
				scrollpercent: 		top / self[2].size.overflowRestHeight,
				viewpercent: 		self[0].clientHeight/self[2].size.scrollMaxY
			});
			
			var message = self[2].message.apply(self[0], [self[1]]);
			
			if (message && message.length) {
				self[1].$iscrollpopup.css({display: 'block', top: '+'+top+'px'});
				span.html( message );
			} else {
				$.fn.iScroll.off_popup(self);
			}
		}
	},
	off_popup : function (self) {
		self[1].$iscrollpopup.removeAttr('style');
	},
	cache : function (self) {
		if (self[1].axis) {
			self[1].$iscrollcache.css({
				top: '-50px',
				left: '-'+self[1].$iscrollbox.css('left'),
				width: self[0].clientWidth+'px',
				height: (self[1].$iscrollbar.height()+100)+'px',
			});
		} else {
			self[1].$iscrollcache.css({
				top:'', left:'', 
				width: '100%', 
				height: '100%'
			});
		}
	},
	eventMousedown : function (self) {
		if (self[1].event.target == self[0] || $.contains(self[0], self[1].event.target)) {
			self[2].focus = true;
		} else if(self[2].focus === true) {
			self[2].focus = false;
		}
		return true;
	},
	eventKeyup : function (self) {
		if (!self[2].focus) return true;
		if(self[2].focus !== true) {
			self[2].focus = true;
			$.fn.iScroll.callback(self, 'stop');
		}
	},
	eventAFMousedown : function (self) {
		window.clearInterval(self[2].activearrow);
		self[2].activearrow = window.setInterval(function () { $.fn.iScroll.eventArrow(self)}, 50);
	},
	eventAFMouseup : function (self) {
		window.clearInterval(self[2].activearrow);
	},
	eventArrow : function (self) {
		if(self[1].event.delegateTarget.getAttribute && self[1].event.delegateTarget.getAttribute('class') == 'iscroll-arrow-first') {
			self[1].event.deltaY = 1;
		} else {
			self[1].event.deltaY = -1;
		}
		$.fn.iScroll.eventWheel(self, 20);
	},
	wheelDirection : function (self) {
		var oe = self[1].event && self[1].event.originalEvent || window.event || event,
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
		
		self[1].event.deltaX = deltaX;
		self[1].event.deltaY = deltaY;
		
		return self[1].event;
	},
	clickPosition : function (self) {
		self[1].event.offsetY = self[1].event.offsetY || self[1].event.originalEvent.layerY;
		self[1].event.offsetX = self[1].event.offsetX || self[1].event.originalEvent.layerX;
	},
	eventWheel : function (self, h, cb) {
		if (!h && !cb) self[1].event = $.fn.iScroll.wheelDirection(self);
		
		if (!self[1].event.deltaY || self[1].axis || 
			(self[1].event.deltaY > 0 && self[0].scrollTop <= 0) || 
			(self[1].event.deltaY < 0 && self[0].scrollTop >= self[2].size.scrollHeight - self[0].clientHeight)) {
			return false;
		}
		var delta = (self[2].options.invertscroll ? -1 : 1) * (self[1].event.deltaY > 0 ? -1 : 1) * (h && !isNaN(h) ? h : self[2].options.wheel);
		
		$.fn.iScroll.gotoScroll(self, self[0].scrollTop + delta);
		$.fn.iScroll.callback(self, cb ? cb : 'scroll');
		
		self[2].event.pos.y = 0;
		self[2].event.pos.x = 0;
		$.fn.iScroll.resetScrollPosition(self);
		
		return false;
	},
	eventStart : function (self) {
		self[2].event.pos.y = parseInt(self[1].$iscrollbar.css('top'));
		self[2].event.start.y = self[2].event.now.y = self[1].event.pageY;
		self[1].axis = $.fn.iScroll.getAxis(self);
		$.fn.iScroll.cache(self);
		$.fn.iScroll.callback(self, 'start');
	},
	eventStop : function (self) {
		if (self[1].axis) {
			$.fn.iScroll.callback(self, 'stop');
			self[2].event.pos.y = 0;
			self[2].event.pos.x = 0;
			self[1].axis = false;
			self[2].event.now.y = false;
		}
		$.fn.iScroll.cache(self);
		$.fn.iScroll.off_popup(self);
	},
	eventDrag : function (self) {
		if (self[1].axis) {
			self[1].event.deltaY = self[2].event.now.y - self[1].event.pageY;
			self[2].event.now.y = self[1].event.pageY;
			var ratio = $.fn.iScroll.moveBarY(self, self[1].event.pageY - self[2].event.start.y + self[2].event.pos.y);
			$.fn.iScroll.gotoScroll(self, ratio * self[2].size.scrollMaxY);
			$.fn.iScroll.cache(self);
			$.fn.iScroll.callback(self, 'move');
			$.fn.iScroll.on_popup(self);
		} else {
			self[1].axis = $.fn.iScroll.getAxis(self);
			$.fn.iScroll.on_popup(self);
			self[1].axis = false;
		}
	},
	eventGoTo : function (self) {
		if (self[1].event.which != 1) return;
		$.fn.iScroll.clickPosition(self);
		
		self[1].event.deltaY = self[1].event.offsetY - self[1].$iscrollbar.position().top;
		
		var top = (	self[1].event.offsetY || 
					self[1].event.original && self[1].event.original.layerY || 
					window.event && window.event.offsetY || 
					window.event && window.event.layerY)
				- self[2].size.barHeight/2;
		
		var ratio = $.fn.iScroll.moveBarY(self, top);
		
		$.fn.iScroll.gotoScroll(self, ratio * self[2].size.scrollMaxY);
		self[1].axis = $.fn.iScroll.getAxis(self);
		$.fn.iScroll.callback(self, 'goto');
		self[1].axis = false;
	},
	eventResize : function (self) {
		if (self[1].$el.height() != self[1].$iscrollbox.height()) {
			$.fn.iScroll.resizeBar(self);
			$.fn.iScroll.resetBarPosition(self);
			$.fn.iScroll.resetScrollPosition(self);
			$.fn.iScroll.callback(self, 'resize');
		} else if(self[1].event && self[1].event.type == 'DOMNodeInserted' && !$(self[1].event.relatedNode).parents('.iscroll').size()) {
			$.fn.iScroll.setDatas(self);
		}
	},
	eventKey : function (self) {
		if (!self[2].focus || (
				self[1].event.keyCode != 33 && 
				self[1].event.keyCode != 34 && 
				self[1].event.keyCode != 38 && 
				self[1].event.keyCode != 40)
			) {
			return true;
		}
		
		if ( self[1].axis || 
			((self[1].event.keyCode == 33 || self[1].event.keyCode == 38 ) && self[0].scrollTop <= 0) || 
			((self[1].event.keyCode == 34 || self[1].event.keyCode == 40 ) && self[0].scrollTop >= self[2].size.scrollHeight - self[0].clientHeight)) {
			if (self[2].focus !== true) {
				$.fn.iScroll.callback(self, 'stop');
			}
			self[2].focus = true;
			return false;
		}
		
		if (self[2].focus !== 'start' && self[2].focus !== 'move') {
			self[2].focus = 'start';
		} else {
			self[2].focus = 'move';
		}
		
		switch (self[1].event.keyCode) {
			case 33: self[1].event.deltaY= 1; $.fn.iScroll.eventWheel(self, self[2].options.pagedown, self[2].focus); break;
			case 34: self[1].event.deltaY= -1; $.fn.iScroll.eventWheel(self, self[2].options.pagedown, self[2].focus); break;
			case 38: self[1].event.deltaY= 1; $.fn.iScroll.eventWheel(self, false, self[2].focus); break;
			case 40: self[1].event.deltaY= -1; $.fn.iScroll.eventWheel(self, false, self[2].focus); break;
		}
	},
	gotoScroll: function (self, y) {
		var scrollTop = parseInt(y < self[2].size.scrollMaxY ? y : self[2].size.scrollMaxY);
		self[1].$iscrollbox.css('top', scrollTop+'px');
		self[0].scrollTop = scrollTop;
	},
	resetBarPosition: function (self) {
		self[1].$iscrollbox.css('top', self[0].scrollTop+'px');
	},
	moveBarY: function (self, top) {
		if (top < 0){
			top = 0;
		} else if (top > self[2].size.overflowRestHeight){
			top = self[2].size.overflowRestHeight;
		}
		self[1].$iscrollbar.css('top', top+'px');
		return top/self[2].size.overflowRestHeight;
	},
	resetScrollPosition: function (self) {
		$.fn.iScroll.moveBarY(self, (self[0].scrollTop/self[2].size.scrollMaxY) * self[2].size.overflowRestHeight );
	},
	dispatchEvent: function (self, type, event) {
		event.stopPropagation();
		self[1].event = event;
		$.fn.iScroll[type](self);
	},
	setEvents : function (self) {
		var dispatch = $.fn.iScroll.dispatchEvent;
		
		self[1].$iscrollcache
			.bind( 'mousedown', function (event) {dispatch(self, 'eventStart', event); return false;} )
			.bind( 'mousemove', function (event) {dispatch(self, 'eventDrag', event)} )
			.bind( 'mouseup', function (event) {dispatch(self, 'eventStop', event)} );
		
		self[1].$iscrolloverflow
			.bind( 'mousedown', function (event) {dispatch(self, 'eventGoTo', event)} )
			.bind( 'mousemove', function (event) {dispatch(self, 'eventDrag', event)} )
			.bind( 'mouseup', function (event) {dispatch(self, 'eventStop', event)} )
			.bind( 'mouseleave', function (event) { dispatch(self, 'off_popup', event);} );
		
		$(window)
			.bind( 'mousedown', function (event) {dispatch(self, 'eventMousedown', event)} )
			.bind( 'mouseup', function (event) {dispatch(self, 'eventStop', event)} )
			.bind( 'keydown', function (event) {dispatch(self, 'eventKey', event)} )
			.bind( 'keyup', function (event) {dispatch(self, 'eventKeyup', event)} );
		
		self[1].$iscrollarrowfirst
			.bind( 'mousedown', function (event) {dispatch(self, 'eventAFMousedown', event)} )
			.bind( 'mouseup', function (event) {dispatch(self, 'eventAFMouseup', event)} )
			.bind( 'mouseleave', function (event) {dispatch(self, 'eventAFMouseup', event)} );
		
		self[1].$iscrollarrowlast
			.bind( 'mousedown', function (event) {dispatch(self, 'eventAFMousedown', event)} )
			.bind( 'mouseup', function (event) {dispatch(self, 'eventAFMouseup', event)} )
			.bind( 'mouseleave', function (event) {dispatch(self, 'eventAFMouseup', event)} );
		
		self[1].$el
			.bind('resize DOMNodeInserted DOMNodeRemoved', function (event) {dispatch(self, 'eventResize', event);})
			.bind( 'mousewheel DOMMouseScroll', function (event) {dispatch(self, 'eventWheel', event); return false;} )
			.bind('iscroll:reload', function (event) {dispatch(self, 'init', event)});
		//currentTarget
		self[1].$iscroll
			.bind('selectstart', function(e){e.stopPropagation();return false})
			.bind('selectstart', '*', function(e){e.stopPropagation();return false});
		
		self[1].$el.parent()
			.bind('resize', function (event) {dispatch(self, 'eventResize', event)});
		
		window.setTimeout(function () {dispatch(self, 'eventResize', $.Event('resize'))}, 250);
	}
};
for(k in i) {
	$.fn.iScroll[k] = i[k];
}

})(window,jQuery);
