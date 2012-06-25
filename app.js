window.App = Ember.Application.create({
  centsPerMBHour: 0.5 / 32
});

App.vscaleUnit = 32;
App.maxVScale = 4096;


// models

App.Service = Ember.Object.extend({
  // optionally supplied by create
  _vscale: 256,
  instances: null,
  
  init: function(){
    this._super();
    this.set('instances', []);
    this.addInstance();
  },
  
  numInstances: function(){
    return this.get('instances').length
  }.property('instances.length'),
  
  addInstance: function(){
    var instance = App.Instance.create({service: this});
    this.get('instances').pushObject(instance);
    return instance;
  },
  
  popInstance: function(){
    return this.get('instances').popObject();
  },
  
  vscale: Ember.computed(function(key, value) {
    // getter
    if (arguments.length === 1) {
      return this.get('_vscale');

    // setter
    } else {
      Ember.assert(
        'attempting to scale to ' + value + ': above ' + App.maxVScale, value <= App.maxVScale);
      Ember.assert(
        'attempting to scale ' + value + ': below ' + App.vscaleUnit, value >= App.vscaleUnit);
      this.set('_vscale', value);
      return value;
    }
  }).property('_vscale'),
  
  canScaleUp: function(){
    return this.get('vscale') >= App.maxVScale;
  }.property('vscale'),
  
  scaleUp: function(){
    var vscale = this.get('vscale');
    var newVScale = vscale + App.vscaleUnit;
    this.set('vscale', newVScale);
  },
  
  canScaleDown: function(){
    return this.get('vscale') <= App.vscaleUnit;
  }.property('vscale'),
  
  scaleDown: function(){
    var vscale = this.get('vscale');
    var newVScale = vscale - App.vscaleUnit;
    this.set('vscale', newVScale);
  },
  
  vscaleStr: function(){
    var vscale = this.get('vscale');
    var unit = 'M';
    if (vscale > 1024){
      unit = 'G';
      vscale = vscale / 1024;
    }
    return vscale + unit;
  }.property('vscale'),
  
  centsHourly: function(){
    return this.get('vscale') * this.getPath('instances.length') * App.centsPerMBHour
  }.property('vscale', 'instances.length'),
  
  dollarsHourly: function(){
    return this.get('centsHourly') / 100;
  }.property('centsHourly'),
  
  dollarsMonthly: function(){
    return this.get('dollarsHourly') * 750;
  }.property('dollarsHourly'),
  
  dollarsMonthlyStr: function(){
    return this.get('dollarsMonthly').toFixed(2);
  }.property('dollarsMonthly')
});

App.Instance = Ember.Object.extend({
    vscaleBinding: 'service.vscale',
});

App.BaseComponent = Ember.Object.extend({
  id: function(){
    return this.get('name').toLowerCase()
  }.property(),
  iconURL: function(){
    return '/img/' + this.get('type') + '/' + this.get('id') + '.png'
  }.property('id')
});

App.ServiceType = App.BaseComponent.extend({
});

App.StackType = App.BaseComponent.extend({
  serviceTypes: function(){
    // return the ServiceType objects for this stack type's serviceTypeIDs
    return this.get('serviceTypeIDs').map(function(item){
      return App.ServiceTypesController.get('serviceTypes').findProperty('id', item)
    });
  }.property()
});

// controllers

App.ServicesController = Ember.Object.create({
    init: function(){
        this._super()
        this.set('services', []);
    },
    addNewService: function(){
      var service = App.Service.create();
      this.addService(service);
      return service;
    },
    addService: function(service){
      service.addObserver('instances.length', function() {
        console.log('service instances length change');
        console.log(service.getPath('instances'));
        console.log(this);
        if (service.getPath('instances.length') == 0){
            App.ServicesController.removeService(service);
        }
      });
      this.get('services').pushObject(service);
    },
    addServiceFromType: function(serviceType){
      var service = App.Service.create({
        serviceType: serviceType
      });
      service.set('vscale', serviceType.initialMemory);
      this.addService(service);
    },
    removeService: function(service){
      this.get('services').removeObject(service);
    },
    totalDollarsMonthly: function(){
      var rawCost = this.get('services').reduce(function(previousValue, item){
        return previousValue + item.get('dollarsMonthly');
      }, 0)
      return rawCost.toFixed(2);
    }.property('services.@each.dollarsMonthly'),
    instancesCount: function(){
      var services = this.get('services');
      var instancesCount = services.reduce(function(previousValue, service){
        return previousValue + service.getPath('instances.length');
      }, 0);
      console.log('instancesCount: ' + instancesCount);
      return instancesCount;
    }.property('services.@each.numInstances'),
    vscaleOptions: data.vscaleOptions
});

// i have a property that depends on an array of arrays, i.e. it needs to be recomputed when an item is added or removed from any of the sub-arrays
// i've declared it as function(){...}.property('topArray.@each.subArray.length', 'topArray.length')
// it updates fine when a new subarray is created, but is ignoring changes in the lengths of the subarrays
// am i just doing something stupid?

App.ServiceTypesController = Ember.Object.create({
  serviceTypes: data.serviceTypes.map(function(item){
    return App.ServiceType.create(item)
  }),
  stackTypes: data.stackTypes.map(function(item){
    return App.StackType.create(item)
  })
});


// views

App.ServiceSelectorView = Ember.View.extend({
  init: function(){
    // components is a list of all service types and preconfigured stack types
    // any component can be added to an application, resulting in one or more
    // services being inserted.
    this._super();
    serviceTypes = App.ServiceTypesController.get('serviceTypes');
    stackTypes = App.ServiceTypesController.get('stackTypes');
    var components = serviceTypes + stackTypes;
    this.set('components', components);
  }
});

App.ComponentView = Ember.View.extend({

});

App.StackTypeView = Ember.View.extend({
  click: function(event){
    var self = this
    // ok, so in the process of debugging my previous problem (missing View.element), I've come across some other strangeness:
    // if i wrap my click handler in a setTimeout, it seems to get processed twice.
    //setTimeout(function(){
      self.getPath('stackType.serviceTypes').forEach(function(serviceType, idx){
        App.ServicesController.addServiceFromType(serviceType);
      });
    //}, 100);
  }
});

App.ServiceTypeView = Ember.View.extend({
  serviceTypesBinding: 'App.ServicesController.services',
  addService: function(event){
    console.log('click!');
    serviceType = this.get('serviceType');
    App.ServicesController.addServiceFromType(serviceType);
    return false;
  }
});

App.ServicesView = Ember.View.extend({
  hasScaled: false,
  addNewService: function(){
    var service = App.ServicesController.addNewService();
    var self = this;
    service.addObserver('vscale', function(){
      self.set('hasScaled', true);
    });
  },
  servicesBinding: 'App.ServicesController.services',
  monthlyDollarsOnly: function(){
    return App.ServicesController.get('totalDollarsMonthly').toString().split('.')[0];
  }.property('App.ServicesController.totalDollarsMonthly'),
  monthlyCentsOnly: function(){
    return App.ServicesController.get('totalDollarsMonthly').toString().split('.')[1];
  }.property('App.ServicesController.totalDollarsMonthly'),
  selectServicesTipHasShown: false,
  showSelectServicesTip: function(){
    if (this.get('selectServicesTipHasShown')){
      return false;
    }
    var show = !this.getPath('services.length');
    this.set('selectServicesTipHasShown', show);
    return show;
  }.property('services.length'),
  instancesTipHasShown: false,
  showInstancesTip: function(){
    console.log('checking if instances tip has shown');
    //if (this.get('instancesTipHasShown')){
    //  console.log('instances tip has shown');
    //  return false;
    //}
    var show = (App.ServicesController.get('instancesCount') == 1);
    this.set('instancesTipHasShown', show);
    return show;
  }.property('App.ServicesController.instancesCount'),
  vscaleTipHasShown: false,
  showVScaleTip: function(){
    if (this.get('vscaleTipHasShown')){
      return false;
    }
    var show = !this.get('hasScaled') && (App.ServicesController.get('instancesCount') == 2);
    console.log('showVScaleTip: ' + show);
    this.set('vscaleTipHasShown', show);
    return show;
  }.property('App.ServicesController.instancesCount', 'hasScaled'),
  vscaleTipStyle: function(){
    if (!this.get('showVScaleTip')){
      return 'visibility: hidden; margin-top:0; margin-left: 0;';
    }
    // the tip needs to be positioned next to the handle of the last service
    // but the new handle hasn't been added to the DOM yet, so start by
    // positioning next to the first handle
    var handles = this.$('.handle');
    var handle = $(handles[0]);
    var vscaleTip = $('#vscale-services-tip');
    console.log('vscaleTip:');
    console.log(vscaleTip);
    var topDelta = handle.offset().top - vscaleTip.offset().top - 7;
    var leftDelta = handle.offset().left - vscaleTip.offset().left;
    leftDelta = leftDelta + (handle.width() / 2) + 15;
    console.log([topDelta, leftDelta]);
    console.log(this.get('services').length);
    if (this.get('services').length != 2){
      // two instances of the first service
      console.log('two instances of the first service');
      topDelta += 25;
      leftDelta -= 25;
    } else {
      // one instance of each of two services
      console.log('one instance of each of two services');
      leftDelta += data.BOX_EDGE + data.BASE_GRID_SIZE;
    }
    console.log([topDelta, leftDelta]);
    var style = 'margin-top: ' + topDelta + 'px; margin-left: ' + leftDelta + 'px;'
    return style;
    console.log('vascale tip style. handle:');
    console.log(handle);
  }.property('App.ServicesController.instancesCount')
});

App.ServiceView = Ember.View.extend({
  // populated at instantiation
  service: null,
  
  // constants mirrored from style.sass
  BASE_GRID_SIZE: data.BASE_GRID_SIZE,
  BOX_EDGE: data.BOX_EDGE,
  
  remove: function(){
    App.ServicesController.removeService(this.service)
  },
  
  hover:function(){
  
  },
  startDrag: function(){
    
  },
  instancesWithIndices: function() {
    var instances = this.getPath('service.instances');
    return instances.map(function(i, idx) {
      return {item: i, index: idx};
    });
  }.property('service.instances.@each'),
  addPadStyle: function(){
    var left = -25 * this.getPath('service.instances.length');
    var left = 'left: ' + left + 'px';
    return left;
  }.property('service.instances.length'),
  showAddPad: function(){
    return this.getPath('service.instances.length') < 5
  }.property('service.instances.length'),
  sliderStyle: function(){
    var shifts = this.getPath('service.instances.length') - 1;
    var left = -25 * shifts;
    var left = 'left: ' + left + 'px';
    return left;
  }.property('service.instances.length'),
  frontStyle: function(){
    var vscale = this.getPath('service.vscale');
    var vUnits = 2 + App.ServicesController.get('vscaleOptions').indexOf(vscale);
    var height = vUnits * this.get('BASE_GRID_SIZE');
    return 'height: ' + height + 'px';
  }.property('service.vscale'),
  topStyle: function(){
    var vscale = this.getPath('service.vscale');
    var vUnits = App.ServicesController.get('vscaleOptions').indexOf(vscale);
    var top = -(vUnits - 4) * this.get('BASE_GRID_SIZE');
    return 'top: ' + top + 'px';
  }.property('service.vscale'),
  sideStyle: function(){
    var vscale = this.getPath('service.vscale');
    var vUnits = 2 + App.ServicesController.get('vscaleOptions').indexOf(vscale);
    var height = vUnits * this.get('BASE_GRID_SIZE');
    return 'height: ' + height + 'px';
  }.property('service.vscale'),
});

App.InstanceView = Ember.View.extend({
  // populated at instantiation
  instance: null,
  index: function(){
    var instance = this.get('instance');
    return instance.getPath('service.instances').indexOf(instance);
  }.property('instance.service.instances'),
  
  boxStyle: function(){
    var left = 'left: ' + (-25 * this.get('index')) + 'px';
    return left
  }.property('index'),
  showPriceLabel: function(){
    var instances = this.getPath('parentView.service.instances');
    var instanceID = instances.indexOf(this.get('instance'));
    // only show the price label for the first instance
    return instanceID == 0;
    /*
    // only show the price label for the last instance
    var numInstances = instances.length;
    console.log('show price label');
    console.log(instanceID + ' ' + numInstances);
    return instanceID + 1 == numInstances;
    */
  }.property('parentView.service.instances.length')
})


/*
App.VScaleSlider = JQ.Slider.extend({
    orientation: 'vertical',
    min: 0,
    max: App.ServicesController.getPath('vscaleOptions.length') - 1,
    value: function(){
        var vscaleOptions = App.ServicesController.get('vscaleOptions');
        var vscale = this.getPath('service.vscale');
        var value = vscaleOptions.indexOf(vscale);
        return value;
    }.property('service.vscale'),
    slide: function(event, ui){
        var vscaleOptions = App.ServicesController.get('vscaleOptions');
        var vscale = vscaleOptions[ui.value];
        this.setPath('service.vscale', vscale);
    },
    change: function(event, ui){
        this.slide(event, ui);
    },
});
*/


App.VerticalSlider = Ember.View.extend({
    min: 0,
    max: 100,
    step: 1,
    orientation: 'vertical',
    _element: null,
    didInsertElement: function(){
        var element = this.get('element')
        console.log(element);
        console.log(this.$());
        if (element === null){
          // WTF...why doesn't this.element exist the second time?
          // http://jsfiddle.net/jVvYL/1/
          // HACK: find and set element manually
          console.log('WTF?');
          var sliders = this.$('.slider-view');
          var element = sliders[sliders.length - 1];
          console.log(sliders);
          console.log(this);
          this.set('_element', element);
        }
        var handles = this.$('.handle');
        var handle = this.$(handles[handles.length - 1]);
        //handle.height(handle.height());
        //handle.height(0);
        handle.height(handle.children().height());
        this.set('handle', handle);
        this.valueChanged();
        console.log('inserted!');
        console.log(handle);
    },
    element: function(){
      var e = this.get('_element');
      return e;
    }.property('_element'),
    dragStart: function(event){
        console.log('in dragStart');
        console.log(event);
        console.log(Object.keys(event));
        console.log(event.originalEvent);
        console.log(Object.keys(event.originalEvent));
        console.log(event.originalEvent.pageY);
        console.log('page coords');
        console.log(event.originalEvent.pageX);
        console.log(event.originalEvent.pageY);
        var handle = this.get('handle')
        this.set('_startX', event.originalEvent.pageX);
        this.set('_startY', event.originalEvent.pageY);
        this.set('_startOffset', handle.offset());
        this.set('_startOffset', this.get('_offset'));
        console.log(this.get('_buckets'));
        /*
        var dragImage = document.createElement("img");
        dragImage.src = 'profile_bw_tall.jpg'; //event.target.src;
        //dragImage.width = 0;
        //dragImage.height = 0;
        event.originalEvent.dataTransfer.setDragImage(dragImage, 10, 10);
        */
    },

    // Firfox doesn't implement drag events consistently, so we have to special-case
    // it and use the "dragOver" event, which doesn't work as well.
    //
    drag: function(event){
      console.log('in drag');
      console.log('browser');
      console.log(BrowserDetect);
      console.log(Object.keys(BrowserDetect));
      console.log(BrowserDetect.browser);
      if (BrowserDetect.browser == 'Firefox'){
        return
      }
      else {
        return this.realDrag(event);
      }
    },
    dragOver: function(event){
      console.log('in dragOver');
      console.log('browser');
      console.log(BrowserDetect);
      if (BrowserDetect.browser != 'Firefox'){
        return
      }
      else {
        console.log('firefox');
        return this.realDrag(event);
      }
    },
    realDrag: function(event){
        // we need to base the change on the delta of mouse movement
        // rather than actual position, because the movement should be
        // independant of where on the handle the click occurs
        
        console.log('in real drag.');
        var startY = this.get('_startY');
        var deltaY = event.originalEvent.pageY - startY;
        var handle = this.get('handle');
        var startOffset = this.get('_startOffset');
        var newOffset = startOffset + deltaY
        
        console.log('startY:');
        console.log(startY);
        console.log('eventY:');
        console.log(event.originalEvent.pageY);
        console.log('startOffset:');
        console.log(startOffset);
        console.log('deltaY:');
        console.log(deltaY);
        console.log('newOffset:');
        console.log(newOffset);
        var bucket = this._offsetToBucket(newOffset);
        console.log('bucket:');
        console.log(bucket);
        if (bucket.position != this.get('position')){
            this.set('position', bucket.position);
            if (this.change){
                this.change(event, {value: bucket.value});
            }
        }
        //this.set('_offset', newOffset);
    },
    _offsetToBucket: function(offset){
        console.log('in offsetToBucket');
        console.log(offset);
        var position = this._offsetToPosition(offset);
        console.log('buckets:');
        var buckets = this.get('_buckets');
        console.log(buckets);
        console.log('position');
        console.log(position);
        var bucket = buckets.find(function(bucket){
            return bucket.catchmentBottom <= position && position <= bucket.catchmentTop;
        });
        return bucket;
    },
    _buckets: function(){
        var range = this.get('max') - this.get('min')
        var step = this.get('step');
        var steps = Math.floor(range / step);
        Ember.assert('improper step size: ' + this.get('step'), range % step == 0);
        var positionStep = this.get('maxPosition') / steps;
        var offset = Math.floor(positionStep / 2)
        var curBucket = {
            bottom: 0,
            catchmentBottom: -Infinity,
            top: offset,
            catchmentTop: offset,
            step: 0,
            position: 0,
            value: this.get('min')}
        var buckets = [curBucket];
        var top, bottom, position;
        while (buckets.length <= steps){
            top = Math.round((buckets.length * positionStep) + offset);
            bottom = curBucket.top + 1;
            position = Math.round((top + bottom) / 2);
            curBucket = {
                bottom: bottom,
                catchmentBottom: bottom,
                top: top,
                catchmentTop: top,
                step: buckets.length,
                position: position,
                value: this.get('min') + (buckets.length * step)
            };
            buckets.push(curBucket);
        }
        bottom = curBucket.top + 1;
        top = this.get('maxPosition');
        buckets.push({
            bottom: bottom,
            catchmentBottom: bottom,
            top: top,
            catchmentTop: Infinity,
            step: buckets.length,
            position: top,
            value: this.get('max')
        });
        
        return buckets;
    }.property('min', 'max', 'step'),
    _postitionToStep: function(){
        return 
    },
    _stepToPostition: function(){
        return 
    },
    _relevantAxis: function(){
        if (self.get('orientation') == 'vertical'){
            return 'y';
        } else {
            return 'x';
        }
    }.property(),
    valueToPosition: function(value){
        console.log(value); 
        var buckets = this.get('_buckets');
        var bucket = buckets.findProperty('value', value)
        var position = bucket.position;
        console.log(position);
        Ember.assert('invalid value: ' + value, typeof position != "undefined");
        return position;
    },
    valueChanged: function(){
        // propagate changes from value to position
        if (this.get('element')){
            this.set('position', this.valueToPosition(this.get('value')));
        }
    }.observes('value'),
    _offsetToPosition: function(offset){
        if (this.get('orientation') == 'vertical'){
            return this.get('_maxOffset') - offset;
        } else {
            return offset - this.get('_minOffset');
        }
    },
    position: Ember.computed(function(key, value) {
        var handle = this.get('handle');
        var offset = this.get('_offset');
        // getter
        if (arguments.length === 1) {
            return this._offsetToPosition(offset);

        // setter
        } else {
            var maxPosition = this.get('maxPosition');
          Ember.assert(
            'attempting to set position to ' + value + ': above ' + maxPosition,
            value <= maxPosition);
          var minPosition = this.get('minPosition');
          Ember.assert(
            'attempting to set position to ' + value + ': below ' + minPosition,
            value >= minPosition);
          if (this.get('orientation') == 'vertical'){
               var newOffset = this.get('_maxOffset') - value;
          } else {
               var newOffset = value + this.get('_minOffset');
          }
          this.set('_offset', newOffset);
          return value;
        }
    }),
    minPosition: 0,
    maxPosition: function(){
        element = $(this.get('element'));
        handle = this.get('handle');
        if (this.get('orientation') == 'vertical'){
            return element.height() - handle.height();
        } else {
            return element.width() - handle.width();
        }
    }.property(),
    _minOffset: function(){
        var element = this.get('element');
        var jqElement = $(element);
        var offset = jqElement.offset()
        return offset[this.get('_relevantOffset')];
    }.property(),
    _maxOffset: function(){
        return this.get('_minOffset') + this.get('maxPosition');
    }.property(),
  
    _offset: Ember.computed(function(key, value) {
        var handle = this.get('handle');
        var relevantOffset = this.get('_relevantOffset');
        // getter
        if (arguments.length === 1) {
          return handle.offset()[relevantOffset];

        // setter
        } else {
            var maxOffset = this.get('_maxOffset');
          Ember.assert(
            'attempting to set offset to ' + value + ': above ' + maxOffset, value <= maxOffset);
          var minOffset = this.get('_minOffset');
          Ember.assert(
            'attempting to set offset to ' + value + ': below ' + minOffset, value >= minOffset);
          var newOffset = {};
          newOffset[relevantOffset] = value;
          this.get('handle').offset(newOffset);
          return value;
        }
    }).property(),
    _relevantOffset: function(){
        if (this.get('orientation') == 'vertical'){
            return 'top';
        } else {
            return 'left';
        }
    }.property()
});

App.VScaleSlider = App.VerticalSlider.extend({
    min: 0,
    max: App.ServicesController.getPath('vscaleOptions.length') - 1,
    value: function(){
        // when vscale changes, we update value
        var vscaleOptions = App.ServicesController.get('vscaleOptions');
        var vscale = this.getPath('service.vscale');
        var value = vscaleOptions.indexOf(vscale);
        return value;
    }.property('service.vscale'),
    // when the slider moves, we update position
    // positionUpdated observes position and updates value
    // if vscale is updated, value should change
    change: function(event, ui){
        var vscaleOptions = App.ServicesController.get('vscaleOptions');
        var vscale = vscaleOptions[ui.value];
        this.setPath('service.vscale', vscale);
    }
});

App.VScaleSliderHandle = Ember.View.extend({
    classNames: ['handle']
});
/*
$('body').mousemove(function(event){
            console.log('move');
        });
App.VScaleSlider = Ember.View.extend({
    mouseDown: function(event){
        console.log('dragging');
        console.log(event);
        this.set('_startX', event.originalEvent.x);
        this.set('_startY', event.originalEvent.y);
        var self = this
        var onMouseMove = function(event){
            console.log('move');
            self._drag(event);
        }
        var onMouseUp = function(event){
            jQuery('body').off('mouseup.vscaleSlider');
        }
        //jQuery('body').on('mousemove.vscaleSlider', onMouseMove);
        //jQuery('body').on('mouseup.vscaleSlider', onMouseUp);
    },
    _drag: function(event){
        var deltaY = event.originalEvent.y - this.get('_startY');
        console.log(deltaY);
    }
});*/

/*App.VScaleSlider = JQ.Draggable.extend({
    axis: 'y',
    dragStart: function(event){
        console.log('dragging');
        console.log(event);
        this.set('_startX', event.originalEvent.x);
        this.set('_startY', event.originalEvent.y);
    },
    drag: function(event){
        var deltaY = event.originalEvent.y - this.get('_startY');
        console.log(deltaY);
    }
});*/
