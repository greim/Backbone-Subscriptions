# Backbone Subscriptions

Backbone subscriptions is a Backbone.js extension that provides loosely-coupled, app-wide communication between views, via a publish/subscribe pattern. Backbone views are introverts when it comes to event handling. They're great at reacting to internally-generated events, but not-so-great at reacting to externally-generated ones. Backbone subscriptions provides a unique and clean solution to this problem.

## Example

    // an event that originates at the global level
    window.addEventListener('message', function(ev){
      var message = JSON.parse(ev.data);
      Backbone.Subscriptions.publish('message', message);
    });

    // a view that subscribes to that event
    var MyView = Backbone.View.extend({
      subscriptions: { 'message': 'handleMessage' },
      handleMessage: function(message){ ... }
    });

The above shows an example of making a view respond to cross-window communication messages originating at `window`. Similar use cases might include subscribing to page visibility or focus changes, device orientation changes, window resize, incoming data from websockets, window scroll, local storage mutations, etc.

## Key concepts

The key concept of Backbone subscriptions — and what differentiates it from similar libraries — is its *DOM-orientedness*. No internal reference map is used to track what instance subscribes to what. Rather, subscribing views are lazily discovered at publish-time via the DOM. This is possible because view elements are given the className 'subscriber'. The browser's native DOM engine is then used to locate these elements in a performant manner. This approach gives three main benefits:

 1. Only views present in the live document receive updates from a channel (AKA a named event).
 2. Views are naturally GC'd as sections of the DOM are overwritten, eliminating the need to manually unsubscribe from channels or write any other reference maintenance/cleanup code.
 3. It allows the implementation to be compact and clean.

## API

The API is quite simple, and pretty much consists of the below:

    Backbone.Subscriptions.publish(channel, [arg1, ... argN])

    Backbone.View.extend({
      subscriptions: { channel: method },
      method: function(arg1, ... argN) { ... }
    });

## Why not just add events in initialize?

    var MyView = Backbone.View.extend({
      initialize: function(){
        window.addEventListener('message', _.bind(function(ev){
          var message = JSON.parse(ev.data);
          this.message(message);
        }, this));
      },
      message: function(message){ ... }
    });

This will certainly work, however it adds a separate event handler to `window` every time a new view is created. Each of these still runs in the background, even though the view is no longer visible in the DOM. Not only is it a CPU drain, but it's a memory leak, since functions stored on the window (the event handlers) maintain references back to every view instance ever created.

## Browser support

Browsers that support [`getElementsByClassName()`](https://developer.mozilla.org/en-US/docs/Web/API/document.getElementsByClassName) or [`querySelectorAll()`](http://www.w3.org/TR/selectors-api2/) are supported. Those methods are what enbable it to do lazy view discovery in a performant manner. In practical terms, this means that Backbone subscriptions should work in all modern browsers, plus IE8 and above.

## AMD/RequireJS

This library creates `Backbone.Subscriptions`. If AMD/RequireJS exists, this object is also what is exported into AMD's registry.

    define([
      'backbone',
      'backbone-subscriptions'
    ], function(
      Backbone,
      subs
    ){
      alert(subs === Backbone.Subscriptions); // true
    });
