---
title: The part of a voice agent nobody demos
description: A demo answers a call in a browser tab. A live agent needs a phone number, a rule for what happens when it fails, and someone to pay for the minutes. That gap is where most projects stop.
pubDate: 2026-08-12
tags: [Voice agents, Telephony]
guide: ai-assistants
---

Every voice agent demo goes the same way. Someone opens a browser tab, clicks a microphone, and has a short conversation with a machine that books an appointment at the end of it. It is genuinely impressive. It also proves less than it looks.

What the demo proves is that a model can hold a scripted exchange for four turns. What it leaves out is everything that makes the thing answerable from a real telephone: a number, a route into the model, a defined outcome for every way the call can go wrong, and an invoice at the end of the month with somebody's name on it.

That missing half is not hard because it is technical. It is hard because it is boring, so almost nobody writes it down, and because it is the half that involves other people's money.

## The demo answers a question nobody asked

A business does not have a problem holding a conversation. It has a problem with the eleven calls that came in while the two people who work there were busy with someone standing in front of them. Six of those callers rang the next place on the list.

That is the shape of the actual problem, and it changes what you build. Nobody needs an agent that can discuss the weather. They need one that answers on the second ring at half past seven in the evening, gets a name and a time into the calendar, and knows the four questions it must not attempt.

## Three questions before you promise a phone number

**Who owns the number?** The number is the client's asset, often older than their website and printed on things you cannot recall. There are usually three paths: port it to the platform that runs the agent, keep it where it is and forward, or take a new number for a trial and leave the old line untouched. Forwarding is the one that gets a project live this week without asking anyone to move something they depend on. Porting is cleaner and slower, and it is a conversation with the client's current carrier, not with you.

**What happens when the agent does not answer?** Not *if*. The model has an outage, the caller asks something out of scope, two calls arrive at once, someone asks for a person and means it. Each of those needs a destination decided in advance: a mobile, a voicemail box, an out-of-hours message, a human. Write that table before you write the prompt. It takes twenty minutes and it is the difference between a system and a demo with a phone number attached.

**Who pays for the minutes, and at what margin?** Voice costs stack per minute: the telephony leg, the speech recognition, the model, the speech synthesis, plus a small monthly rent for the number itself. Every one of those scales with how well the client's business is doing. Quote a flat monthly fee before you know how long their calls run and how many of them there are, and you have written yourself a contract that gets worse the more successful your client becomes.

## The handover is a feature

The instinct is to make the agent handle everything, because handling everything is what the demo suggested. Resist it. An agent that says *I will have someone call you back about that within the hour* and reliably makes that happen is worth more than one that improvises an answer about a medical question, a refund, or a price it has no business quoting.

Decide the stop conditions with the client, in their words, and put them in the prompt as hard rules rather than suggestions. Then test them by trying to talk the agent past them, which takes about ten minutes and is the most useful ten minutes in the build.

## What to test before the first real call

Not in a browser. On a handset, over a mobile network, in the conditions the callers are actually in.

- Ring it from a phone standing near traffic, and again from a supermarket car park.
- Interrupt the agent mid-sentence, the way people talk over each other.
- Give a name it will mishear, and a time like *quarter past nine tomorrow*.
- Say *no, the other Thursday*, then check what actually landed in the calendar.
- Ask for a human, twice, politely, and see where you end up.
- Hang up halfway through the booking and see what state the system is left in.
- Call twice at the same moment from two phones.

Six of those seven will surface something. That is the point of the list.

## Where this ends up

None of the above is a reason not to build voice agents. They work, and the businesses that need them tend to need them badly. It is a reason to treat the demo as the beginning of the estimate rather than most of the work, and to have answers about numbers, failure and cost before a client asks — because a client who has to ask has already noticed that you have not thought about it.
