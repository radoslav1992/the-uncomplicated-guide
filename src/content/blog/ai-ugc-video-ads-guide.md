---
title: "AI Video Ads & UGC: How to Script, Voice, Animate and Edit AI UGC Ads — and Sell Them as a Service"
seoTitle: "AI UGC Video Ads: A Complete Production and Pricing Guide"
description: "A free guide to producing UGC-style AI video ads with ChatGPT or Claude, ElevenLabs, HeyGen and Captions: the brief, the hooks, voice and avatar settings, testing, disclosure, and how to price it as a monthly service."
pubDate: 2026-11-11
kind: guide
tags: [AI video, UGC ads, ElevenLabs, HeyGen]
image: "/articles/ai-ugc-video-ads-guide.webp"
imageAlt: "A phone showing an AI presenter between audio waveforms, representing AI-generated UGC video ads"
socialImage: "/social/ai-ugc-video-ads-guide.png"
---

UGC-style ads — a person talking to camera, phone-shot, captions on — are the format short-form feeds reward. They are also slow and expensive to produce with real people: casting, filming days, reshoots for every new angle. An AI pipeline changes the economics. A script model writes the hooks, a voice model reads them, an avatar presents them, and an editor turns the clip into a native post. The result is not one video, but ten comparable ones and a decision about which works.

This guide is not a catalogue of buttons in four apps. It is a working manual that starts from the business goal, goes through script, voice, avatar and edit, and ends with testing, disclosure, pricing and a monthly report. The four tools it uses are **ChatGPT or Claude** for the script, **ElevenLabs** for the voice, **HeyGen** for the avatar and **Captions** for the edit — but the process is the point, and it survives a change of tools. It started as a paid PDF and is now free to read here.

**Who it is for.** Small-business owners and marketers who want a steady stream of UGC-style ads and Reels without filming days; freelancers and AI agencies who want to sell video creatives as a repeatable monthly service; and anyone who made one impressive avatar demo and got stuck turning it into a process.

**What it is not.** The tools cannot deliver the polish of a cinematic brand film or an emotional launch video yet, and this guide does not pretend otherwise. It is not a way to make fake testimonials — reviews implying a customer experience that did not happen are illegal in many markets, not just risky. And it is not one magic button: it is a production line with hand-offs, checks and versions.

## The pipeline at a glance

Each tool does one job, and every hand-off has a check before the next tool starts:

| Stage | Tool | Input | Output | The check before moving on |
| --- | --- | --- | --- | --- |
| Brief | — | The client's goal | A one-page brief and approved claims | Signed off by someone who knows the product |
| Script | ChatGPT or Claude | The brief | Five hooks and one body | Every claim is on the approved list; length fits the time budget |
| Voice | ElevenLabs | The approved script | One audio file per hook plus the body | Names and numbers correct by ear; pace and tone right |
| Avatar | HeyGen | The approved audio | Presenter clips | Lip-sync, hands and background clean on a phone screen |
| Edit | Captions | The clips | Finished 9:16 variants | Captions in the safe zone; CTA matches the offer; music licensed |

The order matters more than the tools. Most failed AI video projects started with the avatar, because that is the part that feels like magic — and then discovered that the script was about the product rather than the viewer, and nobody had agreed what the ad was for.

## Start from the business goal: the one-page brief

Describe the most common video on one sheet before any tool is opened. The brief is the contract between the business and the production pipeline. It does not need to be long, but every field must be filled by someone who knows the product. Show it to the person who answers customer questions — they know the real objections the owner often forgets.

| Field | Example |
| --- | --- |
| Goal | Leads for a teeth-whitening offer at a dental clinic. |
| Audience | Women 25–40, city, scrolls Reels in the evening, price-sensitive. |
| Offer | Free consultation plus 20% off the first session this month. |
| Approved claims | "Visible result after one session for most patients" — not "guaranteed white teeth". |
| Forbidden claims | Medical outcomes, comparisons to named competitors, "no pain". |
| Proof available | Number of sessions done, before/after photos with signed release. |
| Format | 9:16, 25–35 s, captions on, sound on, avatar presenter with product B-roll. |
| Success | Hook rate above 35% and cost per lead below the current creative within 72 h. |

Two fields do most of the work. **Approved claims** is the list the script is checked against at every stage; anything not on it does not go in. **Success** is a number agreed before production, so that nobody argues about taste afterwards.

### Don't start with "it can do everything"

The first system should produce one format reliably: one platform, one length, one presenter. After 20–30 published variants you will know which second format actually brings value.

## Platforms, formats and the first three seconds

The same clip is not "fine everywhere". Each platform has its own frame, safe zone and rhythm. But short-form platforms reward the same shape: a hook that earns three seconds, a body that earns twenty, and a close that earns the tap. Map the beats before writing a word:

1. **Hook (0–3 s):** a pattern interrupt, a question or a bold-but-true statement addressed to the target viewer.
2. **Problem (3–8 s):** the pain in the viewer's words, not the brand's.
3. **Solution (8–18 s):** what the product does, shown or named concretely.
4. **Proof (18–25 s):** a demonstrable fact, a number you can back up, a before/after that complies with policy.
5. **Offer and CTA (25–30 s):** one action, one place to do it, one reason to do it now.
6. **Disclosure:** the AI label, sponsorship tag or "dramatised" note the platform or law requires.

Build for vertical 9:16 first, with sound on but a hook that works muted — a large share of the feed watches without audio, so the first line must also be on screen. Keep text and faces out of the bottom and right-hand edges, where every app puts its own buttons and captions; the exact height changes with each app update, so check on a real phone rather than trusting an editor's overlay.

Why the first three seconds get so much attention here: whatever ranking systems do downstream, they cannot rank a video people swipe past in the first second. There is a longer piece on this in [Your ad gets three seconds](/blog/your-ad-gets-three-seconds).

## Script: a prompt that holds hard constraints

A model asked for "an ad for a dental clinic" returns something that reads like the About page set to music. Give it the brief, the beats and constraints it is not allowed to break — length, claims, disclosure — and ask for hooks and a body separately.

```text
You are a direct-response scriptwriter for short-form video ads
(TikTok, Instagram Reels, YouTube Shorts), presented to camera by one person.

BRIEF
Goal: {{goal}}
Audience: {{audience}}
Offer: {{offer}}
Approved claims (use only these, word for word or more cautiously):
{{approved_claims}}
Forbidden: {{forbidden_claims}}
Proof available: {{proof}}

HARD CONSTRAINTS
- Total length {{seconds}} seconds at 2.5 words per second:
  no more than {{max_words}} words including the hook.
- Speak to one viewer ("you"). Plain spoken language, short sentences.
- No claim that is not on the approved list. No guarantees.
- Do not imply the presenter is a real customer or describe
  an experience they did not have.
- Write numbers as they should be spoken ("twenty percent").
- End with one call to action: {{cta}}.

OUTPUT
1. Five different hooks of at most 3 seconds (8 words) each:
   a question, a number, a common mistake, a before/after,
   and a contradiction of what the audience assumes.
2. One body that follows any of the hooks:
   problem → solution → proof → offer and CTA.
3. For each line, the claim from the approved list it relies on.
4. A one-line on-screen text version of each hook for muted viewers.
```

The third output item is the useful one for review: every line arrives with the approved claim it depends on, so the person signing off can check claims in a minute rather than re-reading the brief.

### Five hooks, one body

The useful unit of work is not a video but one body with several openings. Get the body right once, then produce hooks against it. Same voice, same avatar, same edit — the only variable is the first three seconds. Producing the extra hooks costs almost nothing once the body exists, which is the real business case for the pipeline, far more than the saving on a film crew.

### Hooks that work and hooks that get rejected

Hooks that tend to hold attention open in the middle of something: a question the viewer would answer "yes" to, a specific number, a mistake the viewer is probably making, a before/after you can show and back up, or a flat contradiction of what the audience assumes.

Hooks that get scrolled past, or rejected by an ad review:

- Generic openers — *"In today's fast-paced world…"* — that announce an ad before saying anything.
- Claims the client cannot prove, or anything implying a guaranteed result.
- Lines that assert or imply something about the viewer's personal characteristics — health, body, finances, beliefs. Ad platforms restrict these, and "Struggling with your weight?" is the classic way to get a creative rejected.
- Fake urgency the offer does not have, and any line that makes the presenter sound like a real customer.

## Voice: ElevenLabs without the robot

Synthetic speech performs punctuation, not meaning. A wall of text with no commas, sentence breaks or pacing gets read at an even canter that sounds like a train announcement. Fixing the writing fixes most of the voice.

### Prepare the text for speech

- **Write numbers in words**, the way they should be said: "twenty percent", "three thirty", "two hundred and fifty".
- **Add the brand to a pronunciation dictionary** — the clinic's name, the product, the street — so every render says it the same way.
- **Use punctuation as direction.** Short sentences, commas where you would breathe, a full stop before the offer. Add breaks deliberately where a pause sells the line.
- **Keep the pace between 2.3 and 2.7 words per second.** Faster sounds like a disclaimer; slower drags in a feed.

### Model and settings

ElevenLabs offers several speech models that trade expressiveness against speed and cost, and the line-up changes; check the current list rather than a tutorial's. For ads, the most expressive model is usually worth it — a flat read wastes the hook. If the model supports inline delivery tags, use them sparingly and listen for tags being read out loud.

In the voice settings, lower stability gives more expressive and less predictable reads; higher stability gives steadier, flatter ones. Generate a few takes of each hook and choose by ear. Changing settings between hooks of the same test breaks the comparison, so lock them once chosen.

### Choosing or cloning a voice

A library voice is the fast, safe start. Cloning a real person's voice — the business owner, a regular presenter — needs that person's explicit consent and the platform's verification, and the rights to use it should be written down with an end date.

### Export and plan rules

Generate anything a client will publish on a paid plan — free tiers do not carry the commercial licence. Export at full quality, name every file with its version, and listen to each one end to end before it leaves your hands: names, numbers, dates and the brand, checked by ear rather than by waveform.

## Avatar: HeyGen, from stock presenter to Digital Twin

HeyGen offers three broad options. **Stock avatars** are ready-made presenters: fastest to start, fine for demos and many ads. **Photo avatars** animate a still image: useful for a consistent brand character, but they need the most scrutiny. A **Digital Twin** is trained on footage of a real person and looks the most natural — and needs the most care with consent.

Drive the avatar with the approved ElevenLabs audio rather than the avatar tool's own text-to-speech. That keeps one voice across every variant and means the audio you checked by ear is exactly the audio the viewer hears.

### The artefacts to check

Watch every render at 100% on a phone screen, not as a thumbnail on a laptop:

- **Lips.** Lip-sync tends to hold for a few seconds and then loosen, especially around numbers, names and anything the audio rushes. Check that it is tight at the start and at the end.
- **Hands.** Gestures that repeat, freeze or melt are the fastest giveaway.
- **Background.** Edges around the hair and shoulders, flicker, and objects that change between cuts.

### Consent before a real likeness goes on camera

A Digital Twin of a real person — owner, employee, hired presenter — needs a signed release that covers where and how long the likeness will be used, plus the consent recording the platform asks for. Keep both on file per client, with a renewal date and a takedown procedure. A stock or photo avatar is the right choice for demos; never put a real likeness in a demo without consent.

## Edit: Captions turns a clip into a native post

The raw avatar clip is not an ad yet. The edit is what makes it look like it belongs in the feed:

- **Cut the dead air.** Trim the first half-second and every pause that does not sell something.
- **Captions inside the safe zone,** large enough to read on a phone, matching the audio word for word.
- **B-roll on the proof.** Cut away from the presenter when the script names the product or the result, so the viewer sees it.
- **Licensed music only.** Trending sounds in the app are often not licensed for paid ads; use the platform's commercial library or a licence that covers the placement.
- **Export 9:16** at the platform's recommended resolution, with the variant name in the file name.

Build a **locked template** per client — fonts, colours, caption style, CTA card, logo position — so every variant differs only in what you are testing.

## Assembling the pipeline: folders, names and checkpoints

The pipeline's value disappears the moment nobody can tell which audio went into which video. One folder per campaign, numbered by stage, and one naming rule:

```text
2026-09_whitening/
  00_brief/        brief_v1_signed.pdf, approved-claims_v1.txt
  01_script/       2026-09_whitening_hookA-E_v2_script.txt
  02_audio/        2026-09_whitening_hookB_v2_audio.mp3
  03_avatar/       2026-09_whitening_hookB_v2_avatar.mp4
  04_edit/         project files and the locked template
  05_exports/      2026-09_whitening_hookB_v2_9x16.mp4
  99_report/       2026-09_report.pdf

name = {campaign}_{hook}_{version}_{stage}.{ext}
```

### Checkpoints between tools

| Hand-off | Check before moving on |
| --- | --- |
| Brief → Script | Every claim in the script appears in the approved list; length within the time budget. |
| Script → Audio | Names, numbers and dates read correctly; no audible tags; pace 2.3–2.7 words per second; file named with version. |
| Audio → Avatar | Same audio version as approved; lip-sync tight at the start and end; hands and background clean. |
| Avatar → Edit | Captions match the audio word for word; safe zone respected; CTA card matches the offer; music licensed for the platform. |
| Edit → Publish | Correct ratio and resolution; AI label set where required; ad-account naming matches the file name. |

Do not re-generate upstream after downstream work is done unless you re-run everything below it. A changed word in the audio means a new avatar render and a new edit; that is cheap in credits but expensive in confusion if the versions are not tracked.

### Step by step for one campaign

1. Fill the one-page brief and the approved-claims list; get written sign-off.
2. Run the scripting prompt; pick 3–5 hooks and one body; get sign-off on claims and disclosure.
3. Prepare the text for speech: numbers in words, pronunciation dictionary for the brand, breaks.
4. Generate audio for each hook plus the shared body; listen to every file end to end.
5. Render avatar clips in HeyGen from the approved audio; inspect at 100% zoom on a phone.
6. Finish in Captions with the client's locked template; export named variants.
7. Run the quality checklist and the disclosure checks below.
8. Publish 3–5 variants; measure for 48–72 hours; keep, iterate or kill.

## Variations, testing and what to measure

The pipeline's real value is not one video — it is ten comparable videos and a decision.

Creative testing is where the AI chain pays for itself. A human shoot gives you one or two versions; the pipeline gives you a matrix. But a matrix only works if you change one variable at a time and read the right numbers. The ad platforms broadly agree on the basics: test a handful of creatives at a time, judge after a short window, and refresh when delivery declines.

| Round | What changes | What stays fixed |
| --- | --- | --- |
| 1 | The hook (3–5 versions) | Body, voice, presenter, edit, offer |
| 2 | The proof or problem section | The winning hook and everything else |
| 3 | The offer framing and CTA | The winning hook and body |
| 4 | Presenter or voice | The winning script |

Three numbers decide each round:

- **Hook rate** — the share of impressions still watching at three seconds. It diagnoses the opening.
- **Hold** — where the retention graph falls off a cliff. That timestamp is a line in your script, and you can go and read it.
- **Cost per result** — whatever the client actually sells, per unit of spend. Everything else is decoration.

Given those three, a failing video tells you which link of the chain broke. Without them, you are re-editing on taste.

## Disclosure, consent and platform rules

The label is not what loses the viewer; a weak second sentence is. Build disclosure into the template rather than treating it as a risk to manage:

- **AI labels.** TikTok, Meta and YouTube each ask for realistic AI-generated or altered content to be labelled, and may apply labels themselves when they detect it. Set the platform's label on every variant, and add an on-screen "AI presenter" note where the client's market or industry expects it.
- **No fake testimonials.** A presenter must never claim or imply a personal experience with the product that did not happen. In the US the FTC's rule on fake reviews and testimonials explicitly covers AI-generated ones, and EU consumer law treats them as an unfair practice. "Dramatised" scenarios should say so.
- **Sponsorship and paid partnership tags** where a real creator's likeness or account is involved.
- **Consent and rights** for every real face and voice, with renewal dates and a takedown procedure on the calendar.
- **Claims** checked against the approved list, especially in health, finance and anything regulated.

## Real costs and a cost formula

Every tool in the chain is a subscription with credits, and the credits are consumed by re-renders as much as by finished videos. Prices and plan limits change often, so take the current numbers from each tool's pricing page and put them into a formula rather than a guess:

```text
cost per finished variant =
    (monthly subscriptions ÷ variants produced per month)
  + credits used per variant, including re-renders
  + your minutes per variant × your hourly rate

monthly delivery cost =
    subscriptions + (variants × credits per variant) + (hours × rate)
```

Track re-renders honestly for the first few campaigns. A variant that needed three avatar renders and two audio takes costs several times the "one render" a sales page suggests — and that ratio, not the list price, is what decides your margin.

Watch the credit balances, plan limits and budget alerts across all four tools. Running out of avatar credits two days before a client's launch is an avoidable kind of emergency.

## Selling it: assessment, offers, pilot and report

### A 15-minute assessment before you build a demo

Before producing anything, find out whether the client is a fit. Signals of a good one: they already run paid social or are ready to fund a test budget; the product can be explained or shown in thirty seconds; they have proof — numbers, results, photos with releases — not only enthusiasm; one person can sign off claims within a day; and there is a measurable result to aim at. A client with no ad budget, nothing they can prove, and five people who need to approve every line will not get value from a testing pipeline, however good the videos look.

### Three levels of offer

Package by outcome and by how much of the loop you run, not by the number of seconds produced:

| Level | What the client gets | Who it suits |
| --- | --- | --- |
| Creative only | A monthly batch of tested-format variants for one platform, one presenter, one length | Clients with an in-house ad manager |
| Creative + testing | The batch plus the test matrix, round-by-round decisions and the monthly report | Small businesses running their own ad account |
| Full service | Several formats or platforms, a Digital Twin with managed consent, and reporting from the ad account | Clients who want one supplier for creative performance |

Price the monthly levels as a retainer with a stated number of variants and revision rounds, and treat extra variants and extra rounds as add-ons. Keep the one-off set-up — brief, claims list, voice and presenter choice, locked template — as a separate fee.

### A pilot that proves value

Offer a short, fixed-price pilot: one product, one platform, one format, a batch of variants built around a hook test, published and measured against the success number from the brief. Agree before it starts what result turns the pilot into a monthly service. A pilot without a pre-agreed success measure ends in a discussion about taste.

### The monthly report

One page that shows value: what was published, hook rate and cost per result per variant, which hook won and why, what the next round will test, and anything that changed in the tools or the rules. It is the document that keeps the retainer from looking like rent.

## Final checklists

A checklist does not replace judgement, but it protects against omissions in a repeatable process. Turn these into tasks in your project tool and require a name and date next to every critical check. The answer "it looked fine on my laptop" is not a test.

**Demo readiness**
- The brief exists and the demo script uses only approved claims.
- A stock or photo avatar is used — no real likeness without consent.
- Voice generated on a paid ElevenLabs plan; brand name pronounced correctly.
- Captions inside the safe zone; the hook works muted.
- The AI presenter label is visible.
- Three hook variants demonstrate the testing idea.

**Pilot readiness**
- Signed releases and consent videos on file for every real presenter.
- Claims list, forbidden list and disclosure text approved by the client's owner.
- Locked finishing template and naming convention.
- Quality checklist passed on real phones for every variant.
- Platform AI labels set; music licensed for the placement.
- Ad-account access or a reporting export agreed; owner of the daily check named.

**Production readiness**
- Credits, plan limits and budget alerts monitored across all four tools.
- A fallback presenter or tool in case a twin is rejected or a service is down.
- Rights renewals and takedown procedure calendared.
- Prompt, template and settings versions traceable to published variants.
- The client knows what the system can and cannot do.
- A periodic report and an improvement loop are in place.
