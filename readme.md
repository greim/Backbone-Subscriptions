# Backbone Subscriptions

Backbone subscriptions is a Backbone.js extension that provides loosely-coupled, app-wide communication between views. It does this via a publish/subscribe pattern. Backbone views are in many ways self-contained mini-apps. Because of this, it's easy for them to react to things that happen in their own scope, but it's messy to try to get them to react to things originating outside of themselves. Backbone subscriptions provides a unique and clean solution to this problem.

## Example

    // an event that originates at the global level
    window.addEventListener('message', function(ev){
      var message = JSON.parse(ev.data);
      Backbone.publish('message', message);
    });

    // a view that subscribes to that event
    var MyView = Backbone.View.extend({
      subscriptions: { 'message': 'handleMessage' },
      handleMessage: function(message){ ... }
    });

The above shows an example of making a view respond to cross-window communication messages originating at the `window` level. Similar use cases might include subscribing to page visibility or focus changes, device orientation changes, window resize, incoming data from websockets, window scroll, local storage mutations, etc.

## Key concepts

The key concept of Backbone subscriptions—and what differentiates if from similar libraries—is its DOM-orientedness. No internal reference map or list is kept of which view instances subscribe to which channels. Rather, subscribing view instances are lazily discovered at publish-time via the DOM. The browser's native DOM access methods are used to do this performantly. `getElementsByClassName()` is used if possible, falling back to `querySelectorAll()`.

This creates three benefits:

 1. Only views present in the document are capable of receiving updates from a channel.
 2. Views are naturally garbage collected as sections of the DOM are overwritten, eliminating the need to manually unsubscribe from channels or write any other cleanup code.
 3. It allows the implementation to be short and clean.

## API

The API is quite simple, and pretty much consists of the below.

    Backbone.publish(channel, [arg1, ... argN])

    Backbone.View.extend({
      subscriptions: { 'channel': 'method' },
      method: function(arg1, ... argN) { ... }
    });

## Why not just add events in initialize?

    var MyView = Backbone.View.extend({
      initialize: function(){
        window.addEventListener('message', _.bind(function(ev){
          var message = JSON.parse(ev.data);
          this.message(message);
        }));
      },
      message: function(message){ ... }
    });

This will certainly work, however it adds additional event handlers to `window` as more instances of that view are created. Each extra handler still runs in the background, even though the view is no longer visible in the DOM. Not only is it a CPU drain, but it's a memory leak, since functions stored on the window (the event handlers) keep references to every view instance ever created.

## No dependencies

Backbone subscriptions has no dependencies besides Backbone. If the [await](https://github.com/greim/await.js) promises library is present, calls to `Backbone.publish()` return await promises that are kept when the call completes. If subscribing view methods don't themselves return await promises, this happens immediately, otherwise it happens after all returned promises are themselves kept.

## Browser support

Browsers that don't support `getElementsByClassName()` or the [selector API](http://www.w3.org/TR/selectors-api2/) aren't supported. Those methods are how it does lazy view discovery in a performant manner. In practical terms, this means that Backbone subscriptions should work in all modern browsers as of 2013, and also in IE8 and above.

## AMD/RequireJS

If AMD/RequireJS exists, this library exports a function in addition to creating `Backbone.publish()`. Both of these have the same signature and behavior.