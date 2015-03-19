Network Traffic Visualization
=============================

I don't have a lot of sysadmin experience. I'm pretty comfortable spinning up a
VM and taking a few simple steps to lock it down--configuring SSH to use keys
rather than passwords, setting up web root directories and not putting sensitive
data in them--but those things don't make me confident enough in the security of
the machine that I would, for instance, trust it with my SSN.

One thing that makes me a little more confident, and that I'd like to be able to
use more widely, is a whitelist security policy. My main difficulty with whitelists
is that I don't have a good way to know if they're working. When I look at the
man page for iptables, it seems like there's a lot of room for error and
misconfiguration. I'd like to be able to compare network traffic as it occurs
with a predefined set of rules to see:

1. Can traffic flow where I intended to allow it?
2. Can traffic flow where I intended to prohibit it?
3. Are there any traffic flows occurring for which no rules exist?

I want *visibility* into the network behavior of a host almost as much as I want
*control* over it. Ideally, I'd like that visibility to span multiple perspectives
of the network, including:

1. What are the network-centric characteristics of a flow? What are the source
and destination IP:PORT addresses? How much data is moving? For what duration?
2. What are the geographic characteristics of a flow? For addresses not under my
control, where on earth are they located? For addresses under my control, use
visual and/or semantic descriptions of the addresses that are meaningful to me.
3. Which of my internal systems are involved in a data flow? I want the maximum
possible information into what processes on my hosts are sending and receiving
data. 

This project explores different ways of visualizing network data to address the
requirements listed above.

SVG Hive Plot notes
===================

We have three types of things we want to draw:

1. axis lines
2. node circles
3. connection paths

These have the following data dependencies:

1. axis lines
a) The angle of the line based on the specific axis
b) the length of the line based on the domain of the axis

2. node circles
a) the angle along which to draw the point
b) the radius from the center at which to draw it

3. connection paths 
a) the angle and radius of the source node
b) the angle and radius of the destination node

The first two of these can be represented by exceptionally simple
objects, especially once we notice that the dependencies for them are
essentially the same:

1. [{ angle: a, radius: r}...]
2. [{ angle: a, radius: r}...]

The connection paths are not so straightforward, because they are
processed in the d3.hive.link function which draws splines from point to
point. But in the simplest case it turns out that what we need is just 
two of the objects representing nodes:

3. [{source: { angle: a, radius: r}, 
target: { angle: a, radius: r}}...]

It turns out that all we needed, for all of this, were a bunch of 
polar coordinates!

These objects can also contain arbitrary other elements, for instance 
anything required to print a sensible description string about them or 
color them. For now, let's say that each will also provide a toString
method that will describe it.

Now we can start to imagine that we could encapsulate all of this in a
directive. It would have three arguments and could take cues on size
and scales from the existing DOM and the data to be plotted. It could
communicate based on scope or callbacks. For instance, instead of
providing actual angles in the angle property, we'll provide an ID of
the axis. The directive will count and assign angles to the axes
internally, then assign the actual angles where they're needed.

First, let's see what we can do do get the data into that shape.

