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
