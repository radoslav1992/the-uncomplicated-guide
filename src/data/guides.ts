import type { ImageMetadata } from 'astro';
import aiAssistantsCover from '../assets/guides/ai-assistants-cover.jpg';
import aiVideoCover from '../assets/guides/ai-video-cover.jpg';

export type GuidePart = { title: string; text: string };

export interface Guide {
  slug: string;
  title: string;
  subtitle: string;
  /** One-liner for cards and meta descriptions. */
  short: string;
  /** Longer paragraph for the guide page hero. */
  description: string;
  status: 'available' | 'soon';
  /** Price in the smallest currency unit (cents). */
  price: number;
  currency: string;
  pages?: number;
  edition: string;
  /** Human-readable "current as of" date. */
  currentAsOf?: string;
  cover?: ImageMetadata;
  parts: GuidePart[];
  outcomes?: string[];
  forWho: string[];
  notFor: string[];
  authorNote?: string[];
  /**
   * Delivery: key of the PDF in the GUIDE_FILES R2 bucket (the exact file name as
   * uploaded, letter for letter) and the file name the buyer's browser saves.
   */
  fileKey?: string;
  fileName?: string;
  /**
   * Stripe Product and/or Price ids (prod_… / price_…) that sell this guide.
   * Payment Links made in the Stripe dashboard carry no metadata, so a paid
   * session is matched to a guide through the ids of what was bought. List every
   * price that leads to this file (promo, other currency…).
   */
  stripeIds?: string[];
  /**
   * Optional Stripe Price id (price_...) used when the site creates the Checkout
   * Session itself. If omitted the session is created with inline price data.
   */
  stripePriceId?: string;
  /**
   * Optional Stripe Payment Link. Used as a fallback only when STRIPE_SECRET_KEY
   * is not configured, so the site still sells while you finish the setup.
   */
  paymentLink?: string;
}

export const guides: Guide[] = [
  {
    slug: 'ai-assistants',
    title: '24/7 AI Assistants',
    subtitle: 'How to build, run and sell AI receptionists and voice assistants',
    short:
      'A practical guide to building and selling voice AI agents that pick up the phone — including the telephony and the bill.',
    description:
      'The same thing a studio does for clients, written so you can do it yourself. Including the part that is usually missing: the telephony and the bill.',
    status: 'available',
    price: 3900,
    currency: 'EUR',
    pages: 35,
    edition: 'English edition — extended version 1.1',
    currentAsOf: '1 September 2026',
    cover: aiAssistantsCover,
    parts: [
      {
        title: 'Strategy',
        text: 'Which businesses gain from a voice agent and which do not. How to work out whether it is worth it before a single euro is spent. Where the agent must stop and hand over to a person.',
      },
      {
        title: 'Build',
        text: 'How to write a prompt that does not fall apart on the third turn. How the agent connects to a real calendar and real data. What to check before it takes its first call.',
      },
      {
        title: 'Telephony',
        text: 'A number, forwarding when the line is busy or unanswered, who pays for the minutes. The part most guides leave out, and the reason projects stall two-thirds of the way in.',
      },
      {
        title: 'Monetization',
        text: 'How to price an agent with variable costs without your busiest clients becoming your worst margin. What goes into the one-off price and what into the monthly fee.',
      },
    ],
    outcomes: [
      'Launch a voice agent that answers the phone and books appointments into a real calendar',
      'Work out in half an hour whether the numbers add up for a specific business',
      'Connect a phone number with forwarding, instead of an agent that only lives in a browser',
      'Set a price that covers the variable cost even in a busy month',
      'Know in advance where it will break — and tell the client before they find out',
    ],
    forWho: [
      'Developers and studios who want to sell agents, not only build them',
      'Business owners with a lot of calls who are thinking of doing it themselves',
      'People who have tried already and got stuck on the telephony',
    ],
    notFor: [
      'Anyone looking for a template to copy without understanding it — this explains why, not only how',
      'Anyone expecting the agent to replace a person. It takes the repetitive part; judgement stays human',
      'Anyone who wants theory about large language models — this is a guide for putting one to work',
    ],
    authorNote: [
      'Radoslav Dodnikov. I teach generative AI at university and I am a PhD candidate in computer science — but the guide is not from the lectures. It is written from things I have shipped: voice agents that answer real phone lines and book real appointments are the same ones discussed inside.',
      'That is why the telephony part is there. It is not in the tutorials because it is boring — and it is exactly where most projects stop.',
    ],
    fileKey: '247_AI_Assistants_ElevenAgents_EN_v1.1_Kova.pdf',
    fileName: '24-7-AI-Assistants-EN-v1.1.pdf',
    paymentLink: 'https://buy.stripe.com/3cI9AV7Tl5nw072gM81Nu01',
    // TODO: add the prod_… id of the product behind the Payment Link above.
    stripeIds: [],
  },
  {
    slug: 'vibe-coding-for-non-developers',
    title: 'Vibe Coding for Non-Developers',
    subtitle: 'How to go from an idea to a working product without writing the code yourself',
    short: 'What to ask for, how to check what you got, and when to stop and call a developer.',
    description:
      'From an idea to a working product without writing the code yourself. What to ask for, how to check what you got, and when to stop and call a developer.',
    status: 'soon',
    price: 3900,
    currency: 'EUR',
    edition: 'English edition · in progress',
    parts: [
      { title: 'Scope', text: 'Deciding what the first version is — and what it is not.' },
      { title: 'Prompting', text: 'Asking for what you want in a way the tools can act on.' },
      { title: 'Shipping', text: 'Getting the thing online, with a domain and a way to pay.' },
      { title: 'Limits', text: 'Recognising the moment to stop and call a developer.' },
    ],
    forWho: [
      'Founders and operators who want a working product before hiring',
      'People who have built a prototype and do not trust it yet',
    ],
    notFor: [
      'Anyone who wants to become a developer — this is about getting a product, not a career',
    ],
  },
  {
    slug: 'working-with-ai-coding-agents',
    title: 'Working with AI Coding Agents',
    subtitle: 'How to run Claude Code and similar agents on real projects',
    short:
      'Setting up, giving instructions that hold, reviewing the output and keeping a codebase you still understand.',
    description:
      'Running Claude Code and similar agents on real projects: setting up, giving instructions that hold, reviewing the output and keeping a codebase you still understand.',
    status: 'soon',
    price: 3900,
    currency: 'EUR',
    edition: 'English edition · in progress',
    parts: [
      { title: 'Setup', text: 'Repository, instructions and guard rails before the first prompt.' },
      { title: 'Instructions', text: 'Writing instructions that survive the tenth session.' },
      { title: 'Review', text: 'Reading what came back without reading every line.' },
      { title: 'Maintenance', text: 'Keeping a codebase you still understand a year later.' },
    ],
    forWho: ['Developers adding agents to their daily work', 'Teams deciding how to adopt them'],
    notFor: ['Anyone who has never written or read code — start with the vibe coding guide'],
  },
  {
    slug: 'ai-video-ads-ugc',
    title: 'AI Video Ads & UGC',
    subtitle: 'How to script, voice, animate and edit AI-generated UGC ads and social videos — and sell them as a service',
    short:
      'The four-tool pipeline — ChatGPT or Claude, ElevenLabs, HeyGen, Captions — as a repeatable production line, with the testing, disclosure and pricing that make it sellable.',
    description:
      'Not a catalogue of buttons in four apps. A working manual that starts from the business goal, goes through script, voice, avatar and edit, and ends with testing, selling, supporting and measuring the result.',
    status: 'available',
    price: 3900,
    currency: 'EUR',
    pages: 35,
    edition: 'English edition — version 1.0',
    currentAsOf: '1 September 2026',
    cover: aiVideoCover,
    parts: [
      {
        title: 'Script',
        text: 'A brief that fixes audience, offer and one measurable result before any tool is opened. A scripting prompt for ChatGPT or Claude that holds hard constraints — seconds, claims, disclosure — and produces five hooks and one body. Which hooks work and which get rejected.',
      },
      {
        title: 'Voice',
        text: 'ElevenLabs models at a glance, the settings and text formatting that stop robotic delivery, choosing or cloning a voice, and the export and plan rules — including the names and numbers you check by ear before the audio leaves.',
      },
      {
        title: 'Avatar',
        text: 'HeyGen: stock avatars, photo avatars and a Digital Twin that looks natural. Driving the avatar with the ElevenLabs audio, the known artefacts to check — lips, hands, background — and the consent you need before a real likeness goes on camera.',
      },
      {
        title: 'Edit & sell',
        text: 'Captions turns the raw clip into a native post: cuts, captions inside the safe zone, B-roll, licensed music, 9:16 export. Then the part that makes it a business — a test matrix, real tool costs, a cost formula, three levels of offer, price frames and a pilot plan.',
      },
    ],
    outcomes: [
      'Produce ten tested ad variants in the time it used to take to make one',
      'Run a 15-minute assessment that tells you whether a client is a good fit before you build a demo',
      'Hand a script to ElevenLabs and HeyGen with file names, versions and checks between every tool',
      'Label, disclose and get consent the way the EU AI Act, the FTC and the platforms expect',
      'Price the service from real tool costs — with three offer levels and a monthly report that shows value',
    ],
    forWho: [
      'Small-business owners and marketers who want a consistent stream of UGC-style ads and Reels without filming days',
      'Freelancers and AI agencies who want to sell video creatives as a repeatable monthly service',
      'People who have made one impressive avatar demo and got stuck turning it into a process',
    ],
    notFor: [
      'Anyone who wants a cinematic brand film or an emotional launch video — the tools cannot deliver that polish yet, and the guide says so',
      'Anyone planning fake testimonials or reviews that imply a customer experience which did not happen — that is illegal in many markets, not just risky',
      'Anyone expecting one magic button — this is a production line with hand-offs, checks and versions',
    ],
    authorNote: [
      'Radoslav Dodnikov. I run a software studio in Sofia and teach generative AI at university. The pipeline in this guide is the one used for real client creatives — the same folder conventions, the same checklists, the same pricing frames.',
      'The chapters on disclosure, consent and real costs are there because they are the ones people skip, and the ones that decide whether the service survives its second month.',
    ],
    fileKey: 'AI_Video_Ads_UGC_Guide_EN_v1.0.pdf',
    fileName: 'AI-Video-Ads-and-UGC-EN-v1.0.pdf',
    stripeIds: [],
  },
];

export const availableGuides = guides.filter((g) => g.status === 'available');
export const upcomingGuides = guides.filter((g) => g.status === 'soon');
export const featuredGuide = availableGuides[0]!;

export const getGuide = (slug: string | undefined) => guides.find((g) => g.slug === slug);
