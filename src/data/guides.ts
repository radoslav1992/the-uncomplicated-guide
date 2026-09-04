import type { ImageMetadata } from 'astro';
import aiAssistantsCover from '../assets/guides/ai-assistants-cover.jpg';

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
   * Delivery: key of the PDF in the GUIDE_FILES R2 bucket and the file name the
   * buyer sees. Upload with:
   *   wrangler r2 object put uncomplicated-guides-files/<fileKey> --file private/guides/<file>.pdf
   */
  fileKey?: string;
  fileName?: string;
  /**
   * Optional Stripe Price id (price_...). If omitted the checkout session is
   * created with inline price data from `price`/`currency`.
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
    fileKey: 'ai-assistants-en-v1.1.pdf',
    fileName: '24-7-AI-Assistants-EN-v1.1.pdf',
    paymentLink: 'https://buy.stripe.com/14AfZja1t2bk8DybrO1Nu00',
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
    slug: 'social-media-content-with-ai',
    title: 'Social Media Content with AI',
    subtitle: 'How to run a consistent channel with AI doing the repetitive part',
    short: 'A weekly system for planning, drafting and publishing — and what you still have to do yourself.',
    description:
      'A weekly system for planning, drafting and publishing with AI doing the repetitive part — and what you still have to do yourself.',
    status: 'soon',
    price: 3900,
    currency: 'EUR',
    edition: 'English edition · in progress',
    parts: [
      { title: 'System', text: 'A weekly rhythm that survives a busy month.' },
      { title: 'Drafting', text: 'Getting drafts that sound like you, not like a model.' },
      { title: 'Publishing', text: 'Scheduling, formats and the boring checklist.' },
      { title: 'Measuring', text: 'Knowing what worked without drowning in dashboards.' },
    ],
    forWho: ['Founders and freelancers running their own channel', 'Small teams without a marketing hire'],
    notFor: ['Anyone looking for growth hacks — this is a system, not a trick'],
  },
];

export const availableGuides = guides.filter((g) => g.status === 'available');
export const upcomingGuides = guides.filter((g) => g.status === 'soon');
export const featuredGuide = availableGuides[0]!;

export const getGuide = (slug: string | undefined) => guides.find((g) => g.slug === slug);
