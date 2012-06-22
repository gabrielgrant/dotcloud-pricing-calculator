window.App = Ember.Application.create({ 
  name: "Example Application",
  logo: "http://sympodial.com/images/logo.png",
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

// controllers

App.ServicesController = Ember.Object.create({
    init: function(){
        this.set('services', []);
        this.addService();
    },
    addService: function(){
      var service = App.Service.create();
      service.addObserver('instances.length', function() {
        console.log(service.getPath('instances'));
        console.log(this);
        if (service.getPath('instances.length') == 0){
            App.ServicesController.removeService(service);
        }
      });
      this.get('services').pushObject(service);
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
    vscaleOptions: [
        32,
        64,
        128,
        192,
        256,
        384,
        512,
        768,
        1024,
        1536,
        2048,
        3072,
        4096
    ]
});


// views

App.ServicesView = Ember.View.extend({
  addService: function(){
    App.ServicesController.addService();
  },
  servicesBinding: 'App.ServicesController.services'
});

App.ServiceView = Ember.View.extend({
  // populated at instantiation
  service: null,
  
  // constants mirrored from style.sass
  BASE_GRID_SIZE: 11,
  BOX_EDGE: 11 /* base-grid-size */ * 6,
  
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
  
  }.property('service.vscale'),
  sideStyle: function(){
  
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
  }.property('index')
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
    didInsertElement: function(){
        console.log(this.get('element'));
        console.log(this.$());
        var handle = this.$('.handle');
        handle.height(handle.height());
        this.set('handle', handle);
        this.valueChanged();
        console.log('inserted!');
        console.log(handle);
    },
    dragStart: function(event){
        var handle = this.get('handle')
        this.set('_startX', event.originalEvent.x);
        this.set('_startY', event.originalEvent.y);
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
    drag: function(event){
        // we need to base the change on the delta of mouse movement
        // rather than actual position, because the movement should be
        // independant of where on the handle the click occurs
        var deltaY = event.originalEvent.y - this.get('_startY');
        var handle = this.get('handle');
        var startOffset = this.get('_startOffset');
        var newOffset = startOffset + deltaY
        var bucket = this._offsetToBucket(newOffset);
        if (bucket.position != this.get('position')){
            this.set('position', bucket.position);
            if (this.change){
                this.change(event, {value: bucket.value});
            }
        }
        //this.set('_offset', newOffset);
    },
    _offsetToBucket: function(offset){
        var position = this._offsetToPosition(offset);
        var bucket = this.get('_buckets').find(function(bucket){
            return bucket.catchmentBottom <= position && position <= bucket.catchmentTop;
        });
        return bucket;
    },
    _buckets: function(){
        var range = this.get('max') - this.get('min')
        var step = this.get('step');
        var steps = Math.floor(range / step) - 1;
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
        while (buckets.length < steps){
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
