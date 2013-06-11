# Backbone Subscriptions

Backbone subscriptions is a Backbone.js extension that provides loosely-coupled, app-wide communication between views, via a publish/subscribe pattern.
Backbone views are introverts when it comes to event handling.
They're great at reacting to internally-generated events, but not so great at reacting to externally-generated ones.
Backbone subscriptions provides a unique and clean solution to this problem.

## Example

    // an event that originates at the global level
    window.addEventListener('message', function(ev){
      var message = JSON.parse(ev.data);
      Backbone.Subscriptions.publish('message', message);
    });

    // a view that subscribes to that event
    var MyView = Backbone.View.extend({
      subscriptions: { 'message': 'handleMessage' },
      handleMessage: function(event, message){ ... }
    });

The above shows an example of making a view respond to cross-window communication messages originating at `window`.
Similar use cases include subscribing to page visibility or focus changes, device orientation changes, window resize, incoming data from websockets, window scroll, local storage mutations, etc.

## Core concepts

What differentiates this from similar libraries is its reliance on the DOM as the system of record for views.
No internal reference map is used to track which instances exist or which subscribes to what.
Rather, subscribing views are lazily discovered at publish-time via the DOM.
This is possible because view elements are given the classname 'subscriber'.
The browser's native DOM engine is then used to locate these elements in a performant manner, by merely looping through a [live NodeList](https://developer.mozilla.org/en-US/docs/Web/API/NodeList#A_.22live.22_collection) on each event.
This approach gives three main benefits:

 1. Only views actually in the page (i.e. views that are reachable through the live DOM) receive updates from a "channel" (AKA an event that you can name anything you want).
 2. Views are naturally GC'd as sections of the DOM are overwritten, eliminating the need to explicitly unsubscribe from channels or write any other reference maintenance/cleanup code.
 3. It allows the implementation to stay compact and clean.

## API

Given that unsubscribing is implicit and no reference cleanup code is needed, the API is rather simple:

### Backbone.Subscriptions.publish(string)

Publish an event on a "channel" (AKA an event with a name of your choosing) identified by the given string.
Subsequent arguments are optional, and are passed along to subscribing methods.
When called, any views that subscribe to that channel, anywhere on the page, are notified.

### view.publish(string)

This method is identical to the one above, except that only descendent views are notified.
In other words, in the DOM tree, if `viewA.el` contains `viewB.el`, but not `viewC.el`, and `viewB` and `viewC` both subscribe to `'foo'`, then calling `viewA.publish('foo')` will only notify `viewB`, not `viewC`.
This is only applicable if/when views instantiate other views and insert them into their own DOM subtree.

### view.subscriptions

This is a map keyed by channel name and valued by method names.
It's similar to the existing events object on Backbone views.

### view.method(event)

This is a method on your view that runs whenever a notification comes in over a channel.
It is passed an event object and any other parameters that were supplied in the call to the publish method.

### Example

    var menu = Backbone.View.extend({
      subscriptions: {
        'orientationchange': 'redraw',
        'resize': 'redraw'
      },
      redraw: function(ev) {
        console.log('redrawing menu in response to ' + ev.channel);
      }
    });

    // elsewhere

    $(window).on('resize orientationchange', function(ev){
      Backbone.Subscriptions.publish(ev.type);
    });

## Why not just add events in initialize?

    var MyView = Backbone.View.extend({
      initialize: function(){
        window.addEventListener('message', _.bind(function(ev){
          var message = JSON.parse(ev.data);
          this.handleMessage(message);
        }, this));
      },
      handleMessage: function(message){ ... }
    });

This is a classic anti-pattern in Backbone development.
It works, but it adds a separate event handler to `window` every time a new view is created.
Each of these continues to run in the background forever, even if the view is no longer present in the DOM.
Not only is it a CPU drain, but it's a memory leak, since functions stored on `window` (the event handlers) maintain reference chains back to every view instance ever created.
Also, it's a potential source of non-performance-related bugs if the event handler is non-idempotent.
Ad-hoc code can be written to avoid some of these penalties, but it's a common enough problem to merit a clean, reusable solution.

## DOM tracking class name

To facilitate lazy discovery of views, each view's `el` is given the class name "subscriber". In cases where this collides with existing HTML classes, the following method can be called when your app first starts:

    Backbone.subscriptions.setDomTrackingClassName('my-custom-class');

## Browser support

Any browser that supports [`document.getElementsByClassName()`](https://developer.mozilla.org/en-US/docs/Web/API/document.getElementsByClassName) or [`document.querySelectorAll()`](http://www.w3.org/TR/selectors-api2/) is supported.
These methods are what enbable it to do lazy view discovery in a performant manner.
In practical terms, this means that Backbone subscriptions should work in IE8 and above, plus any remotely modern Webkit/Gecko/Presto.

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
