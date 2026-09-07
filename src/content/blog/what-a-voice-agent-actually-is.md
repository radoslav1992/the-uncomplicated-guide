---
title: What a voice agent actually is
description: Voice agent, speech agent, voice AI, conversational agent — four names for the same thing. Here is what is inside one, why latency decides whether it feels human, and what separates an agent from a talking FAQ.
pubDate: 2026-09-07
tags: [Voice agents, Explainer]
guide: ai-assistants
---

A voice agent is software that answers the phone, holds a spoken conversation, and does something at the end of it — books the appointment, takes the order, passes the caller to a person.

You will see it called a speech agent, voice AI, an AI receptionist or a conversational agent. They mean the same thing. What matters is the last part of that sentence: *does something*. A system that talks and then leaves you to ring back during office hours is a recording with better manners.

## The loop

One turn of a conversation goes through five stages, and every one of them costs time.

**Transport.** The audio has to get in and out. On a phone call that is a telephony provider bridging the public phone network to your software; in a browser it is a direct audio connection. This layer decides call quality, what happens when the line drops, and — because it is billed by the minute — most of your running cost.

**Hearing.** Speech recognition turns the incoming audio into text, usually while the caller is still speaking rather than after they finish.

**Noticing they stopped.** This is the stage nobody expects to be hard. The system has to decide that a pause is the end of a turn and not someone thinking. Cut in too early and you interrupt people mid-sentence; wait too long and every reply feels like a bad international line. This is called endpointing, and tuning it is most of what makes an agent feel polite.

**Deciding.** A language model reads the conversation so far, along with whatever instructions you gave it, and produces the reply. If the reply needs a fact — is Thursday at three free, has that order shipped — it calls out to a real system to find out.

**Speaking.** Text-to-speech turns the reply into audio, usually streaming the first words out before the sentence is finished, because waiting for the whole thing costs a beat the caller will notice.

## Latency is the whole game

In ordinary conversation, the gap between one person finishing and the next starting is a fraction of a second. People notice a delay long before they can name it. Push much past a second of silence and callers start talking over the agent, repeating themselves, or asking *hello?* — which then arrives as new input and makes everything worse.

The trouble is that the five stages add up, and the delay you feel is the sum, not the worst one. This is why the useful engineering question is never *which model is best* but *where is the time going*. Streaming at every stage — recognising speech as it arrives, sending the first words to be spoken before the sentence is complete — is what turns an agent that technically works into one people do not hang up on.

It is also why a demo on your laptop, on office wifi, tells you very little about a call from a car on a motorway.

## Barge-in

People interrupt. If a caller starts speaking while the agent is mid-sentence, the agent has to stop talking, discard what it was going to say, and listen. Without that, the caller talks over a machine that keeps going regardless, which is the single fastest way to make something feel broken.

Worth testing deliberately, because it rarely comes right by default.

## What makes it an agent

The word *agent* is doing real work in the phrase. A model that talks is a talking FAQ. What makes it an agent is that it can take an action in another system: read a calendar, write a booking, check an order, create a ticket, send a text with a link.

That is also where the difficulty moves once the conversation works. The model must be given a small, well-described set of things it is allowed to do, and it needs to handle the cases where doing them fails — the calendar is unreachable, the slot went five seconds ago, the customer number does not exist. An agent that books appointments confidently into a system that rejected the write is worse than one that never offered.

## Two ways they are built

The classic arrangement is the pipeline above: separate speech recognition, model and speech synthesis, wired together. You can swap any piece, you can read the transcript of every stage, and when something goes wrong you can tell which box did it.

Newer models take audio in and give audio out directly, without a text stage in the middle. They are faster, because there are fewer hops, and they carry things the text pipeline throws away: tone, hesitation, emphasis. In exchange you get less to inspect, fewer places to intervene, and a rebuild if you want to change one part.

Neither is the right answer yet. The pipeline is easier to debug and easier to keep within rules; the direct approach sounds better. It is a genuine trade-off, and worth making deliberately rather than by whichever demo you saw first.

## What it is not

**Not a phone menu.** *Press 1 for opening hours* is a decision tree. It cannot handle "I need to move my Tuesday appointment because my daughter is ill", which is what people actually say.

**Not a chatbot with a voice.** Text chat forgives a two-second pause and a wall of text. Speech forgives neither. Copying a chatbot's script into a voice agent produces something that sounds like a form being read aloud.

**Not a person.** It should say so if asked, it should hand over cleanly when it hits its limits, and the sooner you design for that the better the whole thing works. Deciding where the agent must stop is a business decision, not a technical one.

## The vocabulary

| Term | What it means |
| --- | --- |
| ASR / STT | Automatic speech recognition — audio to text |
| TTS | Text to speech — the voice you hear |
| Endpointing | Deciding the caller has finished a turn |
| Barge-in | Letting the caller interrupt the agent mid-sentence |
| Latency | Total delay from the caller stopping to the agent starting |
| Function calling | The model doing something in a real system |
| Warm handoff | Passing the call to a person with the context so far |
| Concurrency | How many calls can happen at once |

## Where this leaves you

Voice agents work best where the calls are repetitive, the request is narrow, and someone is currently missing them: the appointments nobody answered at seven in the evening, the same five questions all day, the orders taken on a line that is engaged.

They work badly where the conversation is the value — a complaint, a diagnosis, a negotiation — and where being handled by a machine would itself be the insult.

The build is not the hard part. Getting a real number onto it, deciding what happens when it fails, and pricing it so a busy month does not cost you money is the hard part, and that is where most projects stop.
