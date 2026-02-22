// ─────────────────────────────────────────────────────────────────────────────
// siteContent.ts — Centralized text content for all public pages
// Organized by page > section > field. Edit text here instead of in JSX.
// ─────────────────────────────────────────────────────────────────────────────

export const siteContent = {
  // ═══════════════════════════════════════════════════════════════════════════
  // HOME PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  home: {
    hero: {
      eyebrowDefault: 'A Guided Global Journey Into Living Compassion',
      logoAlt: 'The Compassion Course',
      heading: 'The Compassion Course',
      subtitlePrefix: 'with',
      subtitleName: 'Thom Bond',
      subtitleUrl: 'https://thombond.com/',
      descriptionDefault:
        ' Changing Lives for 15 years, in over 120 countries, in 20 languages.  Check out our interactive community member globe.',
      ctaPrimaryDefault: 'Learn More',
      ctaPrimaryLink: '/learn-more',
      ctaSecondaryDefault: 'Register Now',
    },

    peaceEducation: {
      title: 'Why The Compassion Course Matters',
      subhead1: 'It Has Been Proven to Work',
      para1:
        'The course provides the practical \u201Chow to\u201D of creating more understanding, empathy, and compassion in our daily lives. The course starts with foundational concepts and practices that help us understand what engenders compassion and what blocks it, and as the year progresses, we work with more advanced practices that help us effectively bring more compassion into our everyday lives.',
      subhead2: 'Be Part of a Growing, Global Community',
      para2:
        'What began as a weekly email to share the tools of compassionate communication has grown into a vibrant community of tens of thousands around the world. Today, The Compassion Course is available in almost every major populated area on earth, on every side of every conflict, in native languages \u2014 a single, universal learning and teaching community.',
      imageAlt: 'The Compassion Course \u2014 how it works',
      stats: [
        { number: '14', label: 'Years Running' },
        { number: '50,000+', label: 'Registrations' },
        { number: '120+', label: 'Countries' },
        { number: '20', label: 'Languages' },
      ],
    },

    whatYoullLearn: {
      title: "What You'll Learn",
      imageAlt: 'Thom Bond leading a Compassion Course conference',
      outcomes: [
        'Develop awareness of feelings in yourself and others',
        'Identify and articulate universal human needs',
        'Navigate conflict using \u201Cneeds awareness\u201D',
        'Use self-empathy for clearer decision making',
        'Recognize and overcome judgment and criticism',
        'Build a personal self-empathy and empathy support system',
        'Have your needs expressed and understood',
        'Create constructive dialogues with conflict resolution tools',
        'Increase alignment between your values and actions',
        'Be part of our Global Compassion Network community',
        'Access \u201CMentor,\u201D the AI Compassion Course Mentor',
      ],
    },

    sampleTheCourse: {
      title: 'Sample the Course',
      description:
        'Get a feel for how each weekly lesson works. Every message includes a concept, a real story, and a practice you can try right away.',
      sampleWeekPrefix: 'Sample Week',
      storyLabel: 'The Story',
      practiceLabel: 'The Practice',
      readFullSampleText: 'Read the full sample',
      weeks: [
        {
          week: 1,
          title: 'What Empathy Is\u2026 and What It\u2019s Not',
          description:
            'Discover how empathy differs from common listening habits like advising, fixing, or sympathizing. Learn to create space for genuine connection instead of filling it with automatic responses.',
          practice:
            'Notice your own non-empathic patterns this week. When you catch yourself advising or fixing, pause and try: \u201CAre you feeling ___ because you need more ___?\u201D',
          story:
            'A late-night cab ride to retrieve a borrowed car becomes an unexpected lesson in presence \u2014 when a simple empathic reflection opens a Vietnam veteran\u2019s long-held grief.',
          link: '/learn-more#sample-empathy',
        },
        {
          week: 2,
          title: 'The Power of Appreciation',
          description:
            'Explore the difference between praise (designed to control) and genuine appreciation (designed to connect). Learn to express gratitude by naming what someone did and the needs it met.',
          practice:
            'Write ten things currently happening that meet your needs right now. Then share an appreciation with someone: describe what they did, how it made you feel, and which needs it met.',
          story:
            'A small act of kindness for a frightened child on a bookstore escalator turns into one of the most heartfelt \u201Cthank you\u201D moments the author has ever experienced.',
          link: '/learn-more#sample-appreciation',
        },
      ],
    },

    socialProof: {
      testimonials: [
        {
          quote:
            'The Compassion Course completely transformed how I approach relationships and challenges. I discovered tools I never knew I had within me.',
          name: 'Sarah Johnson',
          role: 'Marketing Executive',
        },
        {
          quote:
            'In just three days, I gained clarity on what was holding me back in my career and personal life. The results have been extraordinary.',
          name: 'Michael Chen',
          role: 'Software Engineer',
        },
        {
          quote:
            "The community aspect is incredible. I've made lifelong connections with people who are committed to growth and making a difference.",
          name: 'Emily Rodriguez',
          role: 'Nonprofit Director',
        },
      ],
    },

    courseIncludes: {
      title: 'The Course Includes',
      description:
        'Everything you need for a full year of guided learning, practice, and community support.',
      cards: [
        {
          icon: 'fas fa-envelope-open-text',
          heading: '52 Weekly Messages',
          description:
            'A new lesson every Wednesday at noon ET \u2014 each one with a concept to learn, a real story that illustrates it, and a practice to integrate into daily life. Over 50 concepts and differentiations covering self-empathy, empathy, anger, beliefs, dialogue, appreciation, and more.',
          linkText: 'See the first 10 weeks',
          linkHref: '/learn-more#peek-inside',
        },
        {
          icon: 'fas fa-video',
          heading: '12 Monthly Conferences',
          description:
            'Live 90-minute Zoom sessions with Thom Bond, joined by guest trainers from around the globe, every second Monday of the month. Review and deeper exploration, interactive Q&A, plus an additional,optional 30 minute group practice and harvest, . All sessions are recorded and accessible anytime.',
          linkText: 'Meet Thom Bond',
          linkHref: '/learn-more#about-thom',
        },
        {
          icon: 'fas fa-users',
          heading: 'Global Compassion Network',
          description:
            'The multilingual, multi-cultural connnected community where participants connect worldwide \u2014 discussion groups, empathy buddies, practice partners, mentors, empathy caf\u00E9s, and more.',
          linkText: 'See community options',
          linkHref: '/learn-more#options-extras',
        },
        {
          icon: 'fas fa-bolt',
          heading: '12 monthly Deep-Dive sessions on the Fourth Monday with our guest trainers',
          description:
            'Intermediate and advanced sessions offered throughout the course that bring a multi-cultural perspective as we focus in on key concepts, practices and the challenges we all face in the course and in daily life.',
          linkText: 'What makes this different',
          linkHref: '/learn-more#what-makes-different',
        },
        {
          icon: 'fas fa-star',
          heading: 'Options & Extras',
          description:
            'Practice groups led by CCO facilitators, an optional Certificate of Completion, one-on-one mentoring with alumni, and an Empathy Program, including Empathy Cafes, Empathy Buddyships and Epathy Circles for year-round support.',
          linkText: 'Explore options & extras',
          linkHref: '/learn-more#options-extras',
        },
        {
          icon: 'fas fa-award',
          heading: 'Leadership Opportunities',
          description:
            'Alumni can join the Leadership Community to lead practice groups worldwide, or join the Mentor Community to guide newer participants \u2014 deepening their own practice while giving back.',
          linkText: 'How the course works',
          linkHref: '/learn-more#how-it-works',
        },
      ],
    },

    languages: {
      title: 'Available in 20 Languages',
      description:
        'The Compassion Course is translated and facilitated by dedicated teams around the world, each with their own monthly conferences in their native language.',
      items: [
        { en: 'English', native: 'English' },
        { en: 'German', native: 'Deutsch', url: 'https://www.mitgefuehl-als-weg.com/' },
        { en: 'Spanish', native: 'Espa\u00F1ol', url: 'https://www.elcursodecompasion.org/' },
        { en: 'Arabic', native: '\u0639\u0631\u0628\u0649', url: 'https://www.altarahum.com/' },
        { en: 'Turkish', native: 'T\u00FCrk\u00E7e', url: 'http://www.sefkatkursu.org/' },
        { en: 'Portuguese', native: 'Portugu\u00EAs', url: 'https://www.cursodacompaixao.com.br' },
        { en: 'Polish', native: 'Polski', url: 'https://praktykawspolczucia.pl/' },
        { en: 'Dutch', native: 'Nederlands', url: 'http://cursus.compassiecursus.nl' },
        {
          en: 'Finnish',
          native: 'Suomi',
          url: 'https://www.kuukorento.fi/fi/tuote/24421369-thom-bond-myttunnon-kirja',
        },
        { en: 'French', native: 'Fran\u00E7ais', url: 'https://coursdecompassion.fr' },
        { en: 'Italian', native: 'Italiano', url: 'https://www.compassioncourse.it' },
        { en: 'Greek', native: '\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC', url: 'https://www.cco.gr/' },
        {
          en: 'Romanian',
          native: 'Rom\u00E2n\u0103',
          url: 'https://comunicarenonviolenta.ro/curs-compasiune-online/',
        },
        { en: 'Hebrew', native: '\u05E2\u05D1\u05E8\u05D9\u05EA', url: 'https://www.compassioncommunity.cc/' },
        {
          en: 'Russian',
          native: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439',
          url: 'https://nycnvc.wufoo.com/forms/sd7yd1b0g4vi2z/',
        },
        { en: 'Chinese', native: '\u4E2D\u6587', url: 'https://nycnvc.wufoo.com/forms/s4bymh30l5keb3/' },
        { en: 'Japanese', native: '\u65E5\u672C\u8A9E' },
        { en: 'Korean', native: '\uD55C\uAD6D\uC5B4' },
        { en: 'Hindi', native: '\u0939\u093F\u0928\u094D\u0926\u0940', url: 'https://nycnvc.wufoo.com/forms/sbe2la00nka1p1/' },
        { en: 'Swedish', native: 'Svenska' },
      ],
    },

    cta: {
      heading: 'Registration Opens March 1st, 2026',
      description:
        'The next Compassion Course begins June 24th, 2026. Join 50,000+ people who have taken this journey toward more compassionate living.',
      buttonPrimary: 'Register for the Course',
      buttonSecondary: 'Learn More',
      buttonSecondaryLink: '/learn-more',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARN MORE PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  learnMore: {
    hero: {
      imageAlt:
        'Group of friends sitting together with arms around each other looking out at the view',
      eyebrow: 'A Year-Long Journey in Compassion',
      heading: '52 Weeks That Change How You Relate to Yourself and Others',
      description:
        'Since 2011, The Compassion Course guides people through a practical, week-by-week path to deeper empathy, honest communication, and real connection \u2014 built on the work of Marshall Rosenberg and Nonviolent Communication.',
      buttonPrimary: 'Register Now',
      buttonSecondary: 'See How It Works',
      buttonSecondaryHref: '#how-it-works',
      stats: [
        { number: '50,000+', label: 'People Have Taken the Course' },
        { number: '120+', label: 'Countries Represented' },
        { number: '20', label: 'Languages Available' },
        { number: '14', label: 'Years Running' },
      ],
    },

    origin: {
      title: 'How It All Began',
      imageAlt: 'Two people sharing a warm conversation over tea',
      timeline: [
        {
          year: '2002',
          text: 'Thom Bond discovers Marshall Rosenberg\u2019s Nonviolent Communication and sees a human-oriented technology that changes everything.',
        },
        {
          year: '2003',
          text: 'He closes his engineering firm, studies with Rosenberg, and co-founds the New York Center for Nonviolent Communication.',
        },
        {
          year: '2011',
          text: 'The Compassion Course Online is born \u2014 one concept, one story, one practice per week, delivered by email for a full year.',
        },
        {
          year: 'Today',
          text: 'A global community spanning 120+ countries, 20 languages, with 50,000+ alumni and growing every year.',
        },
      ],
    },

    howItWorks: {
      title: 'How the Course Works',
      description:
        'No classrooms, no rigid schedules. The Compassion Course fits into the life you already have.',
      imageAlt: 'Group of friends laughing and enjoying time together',
      steps: [
        {
          number: 1,
          icon: 'fas fa-envelope-open-text',
          heading: '52 Wednesday Lessons',
          text: 'Starting in June, a new message is published via email every Wednesday at noon ET for 52 consecutive weeks. Each installment provides a concept to learn, a real story illustrating it, and practices for integrating it into daily life \u2014 plus links to previous weeks, videos, exercises, and supplementary resources. Over the year, you\u2019ll explore over 50 concepts covering self-empathy, empathy, emotional triggers, anger, beliefs, dialogue, appreciation, requests, and more.',
        },
        {
          number: 2,
          icon: 'fas fa-video',
          heading: '12 Monthly Conferences',
          text: 'Thom Bond, along with guest trainers from around the globe, hosts 12 monthly 90-minute conferences via Zoom on the second Monday of each month. Each session includes interactive Q&A, group practice, and deeper exploration of the material. Conferences are also hosted in other languages by affiliated course leaders. All sessions are recorded and accessible at any time throughout the course.',
        },
        {
          number: 3,
          icon: 'fas fa-users',
          heading: 'Global Compassion Network',
          text: 'The online community where participants connect from around the globe. Ask questions, discuss course material, share successes and challenges. Access specialized discussion groups covering parenting, relationships, empathy skills, self-compassion, and workplace issues. Find practice groups, mentors, empathy buddies, practice partners, and empathy caf\u00E9s and circles. Create a personalized profile with credentials and connect with the worldwide community.',
        },
        {
          number: 4,
          icon: 'fas fa-robot',
          heading: 'AI Compassion Mentor',
          text: 'Between lessons and calls, the digital AI Mentor is available anytime \u2014 trained on the full course material to help you work through real situations, practice skills, and stay on track.',
        },
      ],
    },

    photoStrip: {
      images: [
        { src: '/images/strip-grandparent.jpg', alt: 'Grandmother and grandchild smiling together' },
        { src: '/images/strip-friends-diverse.jpg', alt: 'Diverse friends laughing together outdoors' },
        { src: '/images/strip-woman-dog.jpg', alt: 'Woman smiling with her dog in a park' },
        { src: '/images/strip-volunteers.jpg', alt: 'Volunteers smiling while working together' },
      ],
    },

    peekInside: {
      title: 'A Peek Inside the Course',
      description:
        'The 52-week journey is built on one core idea: everything we do, we do to meet a need. Each week builds on the last, gradually shifting how you see yourself, others, and conflict itself.',
      descriptionBold: 'everything we do, we do to meet a need.',
      imageAlt: 'Woman reflecting peacefully by a window with a book',
      col1Title: 'First 10 Weeks',
      col2Title: "Then You'll Explore",
      weeklyTopics: [
        { week: 1, title: 'Everything We Do, We Do to Meet a Need' },
        { week: 2, title: 'Most of Us Were Taught Something Else' },
        { week: 3, title: 'We Are All Equipped with Onboard Need Radar' },
        { week: 4, title: "What's the Big Deal with Needs?" },
        { week: 5, title: 'Empathy, the Breath of Compassion' },
        { week: 6, title: 'Hidden Judgments' },
        { week: 7, title: 'More About Feelings' },
        { week: 8, title: 'The Wisdom Inside the Judgment' },
        { week: 9, title: 'Why Is This So Bleeping Hard?' },
        { week: 10, title: "What Empathy Is... and What It's Not" },
      ],
      topicTags: [
        'Boundaries',
        'Making Requests',
        'Anger & Triggers',
        'Shame & Guilt',
        'Observation vs. Evaluation',
        'Beliefs & Thought Patterns',
        'Conflict Resolution',
        'Power Dynamics',
        'Appreciation',
        'Apologies',
        'Vulnerability',
        'Living with Compassion',
      ],
      moreText:
        '50+ concepts and differentiations across 52 weeks \u2014 each one practiced in real life, not just understood in theory.',
      sampleLinks: [
        { href: '#sample-empathy', icon: 'fas fa-file-alt', text: 'Read Sample Week 1: Empathy' },
        {
          href: '#sample-appreciation',
          icon: 'fas fa-file-alt',
          text: 'Read Sample Week 2: Appreciation',
        },
      ],
    },

    sampleEmpathy: {
      badge: 'Sample Week 1',
      title: 'What Empathy Is\u2026 and What It\u2019s Not',
      practicesHeading: 'The Practices',
      concept: {
        heading: 'The Concept',
        paragraphs: [
          'Most of us were taught to listen by formulating responses or solving problems rather than creating genuine connection. Empathy is different \u2014 it\u2019s the exploration of our human experience, our feelings, our needs, our life energy trying to emerge and guide us. It requires presence and curiosity about another\u2019s experience, rather than habits that fill the space instead of opening it up.',
          'The lesson identifies eight common non-empathic response patterns: comparing and one-upping, educating and advising, discounting, fixing and counseling, sympathizing, data gathering and interrogating, explaining and defending, and analyzing. Recognizing these habits is the first step toward real empathic listening.',
        ],
      },
      story: {
        heading: 'The Story: \u201CThe Car, the Clubs and the Cab Driver\u201D',
        text: 'A late-night cab ride to retrieve a borrowed car becomes an unexpected lesson in presence. When the driver mentions seeing the USS Intrepid, it triggers memories of his Vietnam service. Through non-directive listening and gentle empathic reflection, a space opens for the driver\u2019s long-held grief about returning home to hostility. The encounter ends with both men shaking hands \u2014 a moment of genuine human connection through the simple act of being truly heard.',
      },
      practices: [
        {
          heading: 'Practice 1 \u2014 Increase Your Awareness',
          text: 'Notice your own non-empathic communication patterns this week. When you catch yourself advising, fixing, or sympathizing, pause and imagine an empathic alternative using the feelings and needs lists.',
        },
        {
          heading: 'Practice 2 \u2014 The Empathy/Non-Empathy Game',
          text: 'Working with a partner, one person shares a statement needing empathy. The partner responds first with non-empathic patterns, then repeats with an empathic response: \u201CAre you feeling ___ because you need more ___?\u201D',
        },
      ],
    },

    sampleAppreciation: {
      badge: 'Sample Week 2',
      title: 'The Power of Appreciation',
      practicesHeading: 'The Practices',
      concept: {
        heading: 'The Concept',
        paragraphs: [
          'There\u2019s a fundamental difference between praise and appreciation. Praise (\u201Cgood boy,\u201D \u201Cnice job\u201D) is designed to control behavior through conditional approval. Authentic appreciation creates connection \u2014 it acknowledges what someone did and recognizes the value received, without attaching judgment.',
          'By connecting feelings to met needs, we begin to recognize the abundant \u201Cmetness\u201D constantly occurring in our lives \u2014 from bodily functions to environmental support to meaningful work. This practice of living in appreciation transforms our perspective and deepens satisfaction.',
        ],
      },
      story: {
        heading: 'The Story: \u201CA Moving Experience\u201D',
        text: 'At a Barnes & Noble bookstore, a father juggling purchases and a stroller attempts the escalator while his three-year-old son freezes at the top, unable to follow. A small act of kindness \u2014 helping the frightened child onto the moving stairs \u2014 becomes a profoundly meaningful exchange. The boy\u2019s look of relief and heartfelt \u201Cthank you\u201D demonstrate what genuine appreciation feels like when we\u2019re fully present to receive it.',
      },
      practices: [
        {
          heading: 'Practice 1 \u2014 Awareness Check-In',
          text: 'Write a list of ten to twenty things currently happening and needs being met right now (breathing/air, reading/learning, sitting/security). Notice how this awareness affects your feelings.',
        },
        {
          heading: 'Practice 2 \u2014 Appreciate Yourself',
          text: 'Write three ways you contribute to your own life. Identify the needs these meet. Look in the mirror and say \u201CThank you.\u201D (This practice is difficult without smiling.)',
        },
        {
          heading: 'Practice 3 \u2014 Share an Appreciation',
          text: 'Identify something someone said or did that met your needs. Describe what happened, how it made you feel, and which needs were met. Share it in person, by phone, email, or card.',
        },
      ],
    },

    whatMakesDifferent: {
      imageAlt: 'Golden sunrise over misty green hills',
      heading: 'What Makes This Different',
      subtitle:
        "The Compassion Course is rigerous. It is challenging and approaches s a year of gradual, real change.",
      cards: [
        {
          icon: 'fas fa-calendar-week',
          heading: '52 Weeks, Not 2 Days',
          text: 'Real change takes practice. The weekly rhythm gives concepts time to become habits \u2014 integrated into your actual life, not just understood in theory.',
        },
        {
          icon: 'fas fa-layer-group',
          heading: 'Three Traditions Combined',
          text: "Draws on Marshall Rosenberg's NVC, Werner Erhard's transformational approach, and Albert Ellis's cognitive techniques \u2014 both of whom influenced Marshall.",
        },
        {
          icon: 'fas fa-globe-americas',
          heading: 'Truly Global Access',
          text: 'Available in 20 languages with dedicated teams of translators and facilitators. Financial accessibility is a founding value \u2014 cost is never meant to be a barrier.',
        },
        {
          icon: 'fas fa-hands-helping',
          heading: 'Community, Not Isolation',
          text: "Empathy buddies, practice groups, mentors, monthly live sessions \u2014 you're not learning alone. If you want to go far, go with others.",
        },
      ],
    },

    optionsExtras: {
      title: 'Options & Extras',
      description:
        'Enhance your Compassion Course experience with additional resources and community support.',
      items: [
        {
          icon: 'fas fa-user-friends',
          heading: 'Practice Groups',
          text: 'Join an online or in-person practice group led by CCO Facilitators who receive ongoing guidance throughout the course.',
        },
        {
          icon: 'fas fa-certificate',
          heading: 'Certificate of Completion',
          text: 'An optional track with added structure \u2014 track weekly progress, keep a private journal, and receive faculty verification.',
        },
        {
          icon: 'fas fa-chalkboard-teacher',
          heading: 'Mentoring Program',
          text: 'Connect with alumni mentors via the Mentor Directory. Find someone whose schedule, experience, and approach fit your needs.',
        },
        {
          icon: 'fas fa-heart',
          heading: 'Empathy Support',
          text: 'Monthly Empathy Caf\u00E9s, Empathy Circles and an Empathy Buddy Network for year-round practice.',
        },
      ],
    },

    founder: {
      title: 'Meet Thom Bond',
      imageAlt: 'Thom Bond, founder of The Compassion Course',
      quote:
        'My way of making the skills of compassionate living available to anyone, regardless of time and money constraints.',
      quoteAttribution: '\u2014 Thom Bond, on creating the course',
      bio: [
        'Thom Bond spent the first half of his career as an environmental engineer \u2014 developing energy-auditing software, microprocessor-based building controls, and LED lighting products. He was good at it. But in 2002, when he encountered Marshall Rosenberg\u2019s work on Nonviolent Communication, he saw a different kind of technology \u2014 one oriented around people instead of buildings.',
        'He closed his engineering firm to study and teach with Rosenberg full-time. In 2003, Thom and Nellie Bright co-founded the New York Center for Nonviolent Communication (NYCNVC), now a United Nations Civil Society Organization. In 2011, he created The Compassion Course Online to bring these skills to anyone in the world.',
        'Today, Thom leads monthly live conferences for participants, trains Organizer/Facilitators who run local practice groups worldwide, and continues developing new tools like the COMPASS Companions digital guides for conflict resolution.',
        'He is the author of The Compassion Book: Lessons from The Compassion Course and serves on the Advisory Board for the Communications Coordination Committee for the United Nations.',
      ],
    },

    faq: {
      title: 'Common Questions',
      items: [
        {
          question: 'When does the course start and when does registration open?',
          answer:
            'The Compassion Course is offered once a year. It begins on June 24 2026 and runs for 52 consecutive weeks. Registration opens March 1st and closes 14 days after the course starts .',
        },
        {
          question: 'How does the course work?',
          answer:
            'You\u2019ll receive a welcome email before launch with everything you need to get started. Each Wednesday at noon Eastern Time, a new lesson is delivered directly to your email inbox for 52 weeks. Monthly 90-minute live conferences are hosted by Thom Bond on the second Monday of each month at 12 PM ET via Zoom. You also get access to the Global Compassion Network \u2014 the online community hub with forums, practice groups, mentors, and resources.',
        },
        {
          question: 'How much time does it take each week?',
          answer:
            'Each Wednesday lesson takes about 15\u201320 minutes to read. The real learning happens through brief practice moments woven into your everyday life \u2014 conversations, reactions, quiet reflections. No extra time block required. The course is ungraded, so you can participate at whatever level fits your schedule and energy.',
        },
        {
          question: 'Who teaches the course?',
          answer:
            'Thom Bond wrote the Compassion Course and leads the monthly conferences. He brings over 24 years of experience studying and teaching compassionate communication, and co-founded the New York Center for Nonviolent Communication (NYCNVC).',
        },
        {
          question: 'Do I need any prior experience with NVC?',
          answer:
            "Not at all. The course starts from the ground up and builds gradually over 52 weeks. Whether you've never heard of Nonviolent Communication or you've been practicing for years, the weekly rhythm and progression is enjoyed by everyone.",
        },
        {
          question: 'What if I fall behind on weekly lessons?',
          answer:
            'All 52 lessons and conference recordings remain accessible throughout the year. There are no deadlines or grades. Many participants revisit earlier lessons as their understanding deepens \u2014 the course is designed for exactly that.',
        },
        {
          question: 'When are the monthly conferences, and are they recorded?',
          answer:
            'Monthly conferences take place on the second Monday of each month at 12:00 PM Eastern Time via Zoom (video or phone). All conferences are recorded and made available to all participants \u2014 you can access recordings at any time throughout the course via the weekly message links.',
        },
        {
          question: 'Can I communicate with other participants?',
          answer:
            'Yes! Participants receive an invitation to join the Global Compassion Network, the private online community. There you\u2019ll find discussion forums, practice groups, empathy buddies, mentors, and specialized groups for parenting, relationships, workplace issues, and more.',
        },
        {
          question: 'Is the Global Compassion Network required?',
          answer:
            'No, joining the Global Compassion Network is not required. However, it provides access to recordings, practice groups, mentors, discussion forums, and the empathy buddy directory \u2014 so it is highly recommended.',
        },
        {
          question: 'Is the course available in other languages?',
          answer:
            'Yes. The Compassion Course is translated and facilitated in 20 languages including Arabic, German, Spanish, Turkish, Portuguese, Polish, Dutch, Italian, and Finnish. Each language community has its own dedicated team and monthly conferences.',
        },
        {
          question: 'Is there a certification option?',
          answer:
            'Yes. For a small additional fee, you can earn a Certificate of Completion by tracking your weekly progress and keeping a private journal throughout the year and submitting it for verification.',
        },
        {
          question: 'What is the cost? Is financial help available?',
          answer:
            'Tuition for the Participant Track is 240-190 U.S. Dollars  Leadership Track is the same (240-190), however has prerequisites. Accessibility is a founding value of the course \u2014 the course is available to any inspired human, regardless of ability to pay, and alternative payment options are available. CLICK HERE for financial aid information.',
        },
        {
          question: 'How are refunds and cancellations handled?',
          answer:
            'Full refunds are available if you cancel 7 or more days before the course start date, minus a $30 coordination fee. Cancellations within 7 days of the start or during the course receive no refund but a credit toward a future training. For questions, contact coursecoordinator@nycnvc.org or call (646) 201-9226.',
        },
      ],
    },

    cta: {
      heading: 'Registration Opens March 1st',
      text: 'The next Compassion Course begins in June. Join 50,000+ people who have taken this journey toward more compassionate living.',
      buttonPrimary: 'Register for the Course',
      linkText: 'Meet the Team',
      linkHref: '/about',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ABOUT PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  about: {
    hero: {
      heading: 'About the Compassion Course',
      subtitle: 'Peace Education for Everyone, Everywhere, All at Once.',
    },

    story: {
      tagline: 'Be Part of Something Beautiful',
      paragraphs: [
        'The Compassion Course Online is a year-long journey in peace education, created by Thom Bond and supported by the New York Center for Nonviolent Communication (NYCNVC). Our mission is to make the skills of compassionate living available to anyone, regardless of time and money constraints.',
        'What began in 2011 as a weekly email sharing the tools of compassionate communication has grown into a vibrant global community. Today, The Compassion Course is available in almost every major populated area on earth, on every side of every conflict, in native languages \u2014 a single, universal learning and teaching community.',
        "The course draws on three traditions: Marshall Rosenberg's Nonviolent Communication, Werner Erhard's transformational approach, and Albert Ellis's Rational Emotive Behavioral perspective, both of whom influenced Marshall's path.",
      ],
      timeline: [
        { year: '2002', text: 'Thom Bond discovers Nonviolent Communication' },
        { year: '2003', text: 'NYCNVC co-founded with Nellie Bright' },
        { year: '2011', text: 'The Compassion Course Online is born' },
        { year: 'Today', text: '50,000+ registrations across 120+ countries in 20 languages' },
      ],
      imageAlts: [
        'Compassion Course monthly video conference with participants',
        'Group discussion at a Compassion Course workshop',
      ],
    },

    howYouCanHelp: {
      title: 'How You Can Help',
      description:
        'The Compassion Course has grown primarily because participants tell others about it. Here are some ways you can support the mission.',
      cards: [
        {
          icon: 'fas fa-share-alt',
          heading: 'Share the Course',
          text: 'Personal recommendations are the number one way new participants discover the course. Share the invitation link with friends, family, and colleagues:',
          linkText: 'compassioncourse.org/invitation',
          linkHref: 'https://compassioncourse.org/invitation',
        },
        {
          icon: 'fas fa-hashtag',
          heading: 'Spread the Word Online',
          text: 'Follow and share posts from our social media channels. Pre-sized images with course quotes are available for Facebook, Instagram, and Twitter.',
          socialLinks: [
            { href: 'https://www.facebook.com/compassioncourseonline/', label: 'Facebook', icon: 'fab fa-facebook-f' },
            { href: 'https://www.instagram.com/compassioncourse/', label: 'Instagram', icon: 'fab fa-instagram' },
            { href: 'https://twitter.com/compassioncours/', label: 'Twitter', icon: 'fab fa-twitter' },
          ],
        },
        {
          icon: 'fas fa-clipboard-list',
          heading: 'Community Outreach',
          text: 'Post a flyer on community bulletin boards at libraries, yoga studios, meditation centers, universities, and workplaces. Printable flyers are available from our team.',
          linkText: 'coursecoordinator@nycnvc.org',
          linkHref: 'mailto:coursecoordinator@nycnvc.org?subject=Flyer%20Request',
          linkIcon: 'fas fa-envelope',
        },
        {
          icon: 'fas fa-hand-holding-heart',
          heading: 'Volunteer Your Skills',
          text: 'Help with translation, facilitation, tech support, or community organizing. The course runs entirely on the generosity of volunteers around the world.',
          linkText: 'coursecoordinator@nycnvc.org',
          linkHref: 'mailto:coursecoordinator@nycnvc.org?subject=Volunteer%20Inquiry',
          linkIcon: 'fas fa-envelope',
        },
      ],
    },

    team: {
      title: 'Meet the Team',
      description:
        'The Compassion Course is translated, facilitated, and supported by dedicated volunteer teams across 8 language communities around the world.',
      contactLabel: 'Contact:',
      sections: [
        {
          section: 'English Team',
          members: [
            {
              name: 'Thom Bond',
              role: 'Compassion Course Author and Lead Trainer, Founder and Director of Education of NYCNVC',
              photo: '/Team/ThomBond.png',
              bio: [
                'Thom brings 29 years of human potential experience and training experience to his work as an Internationally Certified NVC Trainer. His passion and knowledge of Nonviolent Communication (NVC) combine to create a practical, understandable, humorous, and potentially profound approach for learning and integrating the skills of peacemaking. He is described as concise, inspiring, sincere and optimistic, applying transformational and spiritual ideas and sensibilities to real-life situations. Many of his students become active facilitators, trainers and practitioners.',
                'As a trainer, speaker, mediator, and coach, Thom has taught tens of thousands of clients, participants, readers and listeners Nonviolent Communication. He has been published or featured in The New York Times, New York Magazine, Yoga Magazine.',
                'He is a founder and the Director of Education for The New York Center for Nonviolent Communication (NYCNVC), the creator of The Compassion Course, a member of the Communications Coordination Committee for the United Nations and a CNVC IIT trainer.',
              ],
              contact: 'thombond@nycnvc.org',
            },
            {
              name: 'Antonio Espinoza',
              role: 'Compassion Course Spanish Team Leader, Assistant Director, NYCNVC',
              photo: '/Team/AntonioEspinoza.png',
              bio: [
                "As an Assistant Director at NYCNVC Antonio's communication and outreach work has played a major role in our mission of sharing NVC around the world.",
                'Antonio is currently a Discovery Weekend Facilitator, Integration Program Graduate, Leadership Program participant and a principle member of the Spanish Translation and Coordination team for The Compassion Course Online.',
                "Antonio's ability to both learn and practice NVC serves as a model and as an inspiration for all those who work with him.",
              ],
              contact: 'antonio@nycnvc.org',
            },
            {
              name: 'Doreen Poulin',
              role: 'Compassion Course Assistant Coordinator, Assistant Facilitator, NYCNVC',
              photo: '/Team/DoreenPoulin.png',
              bio: [
                'Doreen dedicated much of her life to helping people of all ages communicate more effectively in her career as a speech-language pathologist in hospital, private, and special education settings.',
                'The desire to improve her own communication skills brought her to NYCNVC in 2013. She completed the NYCNVC Integration Program, and has gone on to facilitate multiple weekend programs, and co-facilitate NYCNVC Practice Groups.',
                "Since February 2019, she has been a Core Team member and a Course Coordinator for the Compassion Course. Her value for purpose and meaning are met with her involvement in the development and coordination of NYCNVC programs and her role as Thom's executive assistant.",
                'Doreen sees that as she continues to practice living with needs-based consciousness, her ability to connect to herself and others, to find understanding and acceptance, and to communicate authentically brings more harmony into her life. Sharing this way of living with others brings her hope for more peace on earth, one empathetic interaction at a time.',
              ],
              contact: 'doreen@nycnvc.net',
            },
          ],
        },
        {
          section: 'German Team',
          members: [
            {
              name: 'Gabriele Vana',
              role: 'German Language Translation Team Leader, Lead Facilitator',
              photo: '/Team/GabrieleVana.png',
              bio: [
                'Gabriele has been studying Nonviolent Communication intensely since 2006. Her teachers have been Gabriel G\u00F6\u00DFnitzer (Austria), Nada Ignjatovic-Savic (Serbia), Robert Gonzales (USA), John Kinyon (USA), Thom Bond (USA), Gina Lawrie (GB), Jeff Brown (USA), Wes Taylor (USA).',
                'She has been giving public talks and facilitating workshops and practice groups since 2009. Gabriele holds a high value for connection to the life-serving energy and loves inner and outer peace.',
                'She is very excited about contributing to the Compassion Online Course that enables so many people all over the world to have access to hearing and learning more about the idea of compassion.',
              ],
              contact: 'betreuung@mitgefuehl-als-weg.co',
            },
            {
              name: 'Sabine Bends',
              role: 'German Language Translation Team Primary Proofreader',
              photo: '/Team/SabineBends.png',
              bio: [
                'Translator, student of The Work of Byron Katie and Nonviolent Communication. The question she constantly asks herself: What would Love do? She wishes to live from her heart and to others in every moment.',
                'Sabine finds that the Compassion Online Course speaks exactly to these issues. The easy to follow guidelines through the basic concepts, the stories of everyday life and the vast variety of practices and exercises offer a wonderful framework to cultivate a loving attitude and encourage people to see for themselves what it is like to live and connect from the heart in every moment.',
              ],
              contact: 'betreuung@mitgefuehl-als-weg.com',
            },
          ],
        },
        {
          section: 'Arabic Team',
          members: [
            {
              name: 'Shahinaz El Hennawi',
              role: 'Compassion Course Arabic Team Leader, Assistant Facilitator',
              photo: '/Team/ShahinazElHennawi.png',
              bio: [
                'Shahinaz el Hennawi is a co-active coach from the Coaching Training Institute \u2013 USA. She has over ten years experience in projects related to peacebuilding. She is an active peacemaker through programs and her leadership of groups and circles.',
                'Shahinaz has studied and worked in USA, Europe, Asia and Central America. She holds undergraduate and graduate degrees from the University for Peace.',
                'Shahinaz discovered NVC in 2010 during her time in Austria. She found it to be such an enriching experience, she decided to take her learning forward and integrate it in her life and home country Egypt. In New York she created a partnership with Thom Bond and NYCNVC to bring NVC to the Arab speaking World.',
              ],
              contact: 'arabic_coordinator@nycnvc.org',
            },
            {
              name: 'Dina Ali',
              role: 'Compassion Course Arabic Team Translator, Assistant Facilitator',
              photo: '/Team/DinaAli.png',
              bio: [
                'Dina Ali is a Website Editor in French, Arabic and English at the Bibliotheca Alexandrina since 2008, and a Translator since 2005.',
                'Together with Shahinaz El-Hennawi, they launched \u201CShams Women\u201D to spread love and compassion, and support individuals in their path to self-development and inner peace. She is now part of The Compassion Course Arabic Translation Team, dedicated to bring NVC to Egypt and other Arabic speaking neighbors.',
              ],
              contact: 'arabic_coordinator@nycnvc.org',
            },
            {
              name: 'Kholoud Said',
              role: 'Compassion Course Arabic Team Translator',
              photo: '/Team/KholoudSaid.png',
              bio: [
                'Kholoud Said works as Website Editor at the Bibliotheca Alexandrina, and a Translator, Researcher, and Civil Society Trainer and Consultant. She has a BA in English Literature and is currently pursuing her MA in Comparative Literature.',
                "With the Egyptian Revolution, Kholoud noticed the danger of polarization and became part of a group to study Marshall Rosenberg's Nonviolent Communication, and try to apply its concepts in daily life.",
              ],
              contact: 'arabic_coordinator@nycnvc.org',
            },
            {
              name: 'Yasmine Arafa',
              role: 'Compassion Course Arabic Team Translator',
              photo: '/Team/YasmineArafa.png',
              bio: [
                'Yasmine Arafa has a law degree (LLB) from the University of Alexandria, Egypt. As the research associate of the vice rector, University for Peace, she has taken part in projects as a researcher and evaluation consultant working in academic and field research as well as multinational conflict resolution and peace studies projects.',
              ],
              contact: 'arabic_coordinator@nycnvc.org',
            },
          ],
        },
        {
          section: 'Spanish Team',
          members: [
            {
              name: 'Celeste De Vita',
              role: 'Compassion Course Spanish Team Lead Translator',
              photo: '/Team/CelesteDeVita.png',
              bio: [
                'Celeste hails from Argentina and serves as the lead translator for El Curso de Compasion. She discovered NVC in 2013, when she attended a practice group. In 2014 she got her Psychology degree in UBA (Universidad de Buenos Aires).',
                'Since she finished the Compassion Course, her wish to give back something for the precious tools she had learned, moved her to offer her help as a translator to create the Spanish Compassion Course.',
              ],
              contact: 'celeste.devita@gmail.com',
            },
            {
              name: 'Ang\u00E9lica Maeireizo Tokeshi',
              role: 'Compassion Course Spanish Primary Proofreader',
              photo: '/Team/AngelicaMaeireizoTokeshi.png',
              bio: [
                'Ang\u00E9lica has been joyfully volunteering her time as a proofreader of the Spanish translation for the Compassion Course. She discovered NVC in 2012. She has more than 10 years of lecturing and introducing Biophilic Architecture and researching on Mindful Urbanism.',
                'She has also facilitated Restorative Justice & Forgiveness Workshops in her birthplace of Lima, Peru.',
              ],
            },
          ],
        },
        {
          section: 'Turkish Team',
          members: [
            {
              name: 'Mustafa T\u00FCl\u00FC',
              role: 'Facilitator and Tech Support',
              photo: '/Team/MustafaTulu.png',
              bio: [
                'Besides facilitating, Mustafa handles the technical side of the Compassion Course, such as the website and preparation and delivery of e-mails. He comes from a technical background with a computer engineering degree and is a PMP certified project manager.',
                'He met nonviolent communication in 2015, received introductory training in 2017 and had the distinct chance to learn from the late Robert Gonzales in the EURO LIFE program. The Compassion Course became a resource he joined immediately and was very impressed by its content and setting.',
              ],
            },
            {
              name: 'Nihal Artar',
              role: 'Facilitator and Translator',
              photo: '/Team/NihalArtar.png',
              bio: [
                'Nihal studied Communication Sciences at university. Her interest in Nonviolent Communication started by participating in circles between 2015\u201317. She attended the Compassion Course 3 times.',
                'In addition to organizing the course in Turkish with Mustafa, they also organize Compassion Course Practice meetings as an appendix to the course. Their learning community is growing day by day with course and practice meetups.',
              ],
            },
          ],
        },
        {
          section: 'Portuguese Team',
          members: [
            {
              name: 'Leticia Penteado',
              role: 'Lead Translator / Facilitator',
              photo: '/Team/LeticiaPenteado.png',
              bio: [
                'Graduated in Law and Education, with a postgraduate degree in Transpersonal Psychology. Since 2010, Leticia has been facilitating conversations using NVC, Mediation, Restorative Justice, and other paths to connection. Co-founder of Conex\u00E3o Emp\u00E1tica, Festival da Empatia and Comunidade Colar, and co-author of the Applied NVC method.',
                'Leticia has been enthusiastically following the Compassion Course since 2016 \u2014 first as a student, then as a group facilitator and, finally, as part of the Portuguese team as lead translator.',
              ],
              contact: 'conexaoempatica@gmail.com',
            },
            {
              name: 'Diana de Hollanda',
              role: 'Facilitator',
              photo: '/Team/DianadeHollanda.png',
              bio: [
                'Author of a poetry book and a novel. Certified Meditation, Compassion and Mindfulness Teacher by the MMTCP (University of California, Berkeley). Diana has been following the Compassion Course since 2017; she is a facilitator and a member of the Portuguese team, mainly proofreading and preparing the texts.',
                'She is also cofounder of Comunidade Enra\u00EDza, which combines Mindfulness, Meditation and NVC practices.',
              ],
              contact: 'escritadoinsight@gmail.com',
            },
            {
              name: 'Igor Savitsky',
              role: 'Tech Support',
              photo: '/Team/IgorSavitsky.png',
              bio: [
                'Igor works as a federal attorney. Graduated in Law and Computer Engineering. Co-founder of Conex\u00E3o Emp\u00E1tica and co-author of the Applied NVC Method.',
                'Igor took the Compassion Course for the first time in 2019 and collaborates with the Portuguese team as \u201Cthe tech guy.\u201D',
              ],
              contact: 'conexaoempatica@gmail.com',
            },
          ],
        },
        {
          section: 'Polish Team',
          members: [
            {
              name: 'Adam Kusio',
              role: 'Coordinator of the Polish Edition',
              photo: '/Team/AdamKusio.png',
              bio: [
                'He has 18 years of corporate experience. He is a trainer, mediator and facilitator of Restorative Circles. He facilitates practice groups and individual sessions.',
                'Fascinated with the clarity and precision of presenting key notions of nonviolence and the practical character of the course, he organized the Polish edition in 2019. He led three year-long practice groups around the course material.',
              ],
              contact: 'kontakt@praktykawspolczucia.pl',
            },
            {
              name: 'Agnes Kowalski',
              role: 'Editor and Proofreader',
              photo: '/Team/AgnesKowalski.png',
              bio: [
                "She came across Marshall B. Rosenberg's NVC for the first time when her son was two. After she came across M. Rosenberg's idea, nothing was the same. After eight years this process is still in progress.",
                'Agnes is very happy that she can contribute to the Polish edition of the course with her editing and proofreading skills.',
              ],
              contact: 'agnes.kowalski@gmail.com',
            },
            {
              name: 'Magdalena Maci\u0144ska',
              role: 'Translator',
              photo: '/Team/MagdalenaMacinska.png',
              bio: [
                'She is a translator and interpreter of English and French into Polish. In 2019, Marie Miyashiro\'s book "The Empathy Factor" was published in her translation.',
                'Through Nonviolent Communication she got fascinated with the practice of empathy and deep listening. She joined the team translating the course material into Polish.',
              ],
              contact: 'm.macinska@interia.pl',
            },
          ],
        },
        {
          section: 'Netherlands Team',
          members: [
            {
              name: 'Sara Nuytemans',
              role: 'Translator, Trainer, Supervisor and Coordinator of the Dutch Course',
              photo: '/Team/SaraNuytemans.png',
              bio: [
                "In 2012 Sara read Marshall Rosenberg's book Nonviolent Communication and a lot of things fell into place. In 2016 she participated in Thom Bond's online course that deepened her practice. She wanted to translate this course and share it with the Dutch-speaking world.",
                'The online course Mededogen Als Weg is the result. In addition, she gives offline basic NVC courses and practices hypnotherapy.',
              ],
            },
          ],
        },
      ],
    },

    cta: {
      heading: 'Get Involved',
      text: 'Registration opens March 1st, 2026. The next Compassion Course begins June 24th, 2026. Join 50,000+ people who have taken this journey toward more compassionate living.',
      buttonPrimary: 'Register for the Course',
      linkText: 'Learn More',
      linkHref: '/learn-more',
      contact: {
        heading: 'Questions?',
        email: 'coursecoordinator@nycnvc.org',
        phone: '(646) 201-9226',
        socialLinks: [
          { href: 'https://www.facebook.com/compassioncourseonline/', label: 'Facebook', icon: 'fab fa-facebook-f' },
          { href: 'https://www.instagram.com/compassioncourse/', label: 'Instagram', icon: 'fab fa-instagram' },
          { href: 'https://twitter.com/compassioncours/', label: 'Twitter', icon: 'fab fa-twitter' },
        ],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VOLUNTEER PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  volunteer: {
    hero: {
      eyebrow: 'Get Involved',
      heading: 'Help Spread Compassion',
      description:
        'Our ability to offer this course to anyone in the world is sustained by participants telling others about it and community members helping each other integrate this work.',
    },

    waysToHelp: {
      title: 'Things You Can Do',
      subtitle: 'Every small action helps grow a more compassionate world.',
      cards: [
        {
          eyebrow: 'Step 1',
          heading: 'Share with Friends & Family',
          text: 'It makes a big difference when someone who doesn\u2019t know about the course hears about it from someone they know. Share our invitation link with friends, a list-serv, or an online group you belong to.',
          linkUrl: 'compassioncourse.org/invitation',
          note: 'We created this page specifically for people you want to invite, so you don\u2019t have to do much of the talking.',
        },
        {
          eyebrow: 'Step 2',
          heading: 'Share on Social Media',
          text: 'Many people who wouldn\u2019t usually hear about the course find out through social media. Share pictures with quotes that we\u2019ve already prepared \u2014 information about the course travels far and wide.',
          socialLinks: [
            { href: 'https://www.facebook.com/TheCompassionCourse', label: 'Share on Facebook', icon: 'fab fa-facebook-f' },
            { href: 'https://www.instagram.com/thecompassioncourse', label: 'Share on Instagram', icon: 'fab fa-instagram' },
            { href: 'https://twitter.com/CompassCourse', label: 'Share on Twitter', icon: 'fab fa-twitter' },
          ],
        },
        {
          eyebrow: 'Step 3',
          heading: 'Post a Flyer in Your Community',
          text: 'Have a local bulletin board where people might be interested? Print and post our flyer in coffee shops, libraries, community centers, yoga studios, and other gathering places.',
          flyerUrl:
            'https://www.dropbox.com/scl/fo/r5w86cmm9e2vhi360dqzn/AL5G65VmhBVhMZU6uHSAnb4?dl=0&e=1&preview=CCO-2025.png&rlkey=j7jhp6n0fkokku7r799j1s03q',
          flyerButtonText: 'View & Download the Flyer',
        },
      ],
    },

    growthMessage: {
      icon: 'fas fa-seedling',
      heading: 'How the Course Grows',
      leadText:
        'As we watched the course grow over the past years, it has become very clear that our ability to offer this course to anyone in the world is sustained by two things:',
      cards: [
        {
          icon: 'fas fa-users',
          bold: 'Participants telling others about it.',
          text: 'Whether via Facebook, email, on the phone or at the dinner table, our participants are the greatest single source of new registrations and a continuously growing community.',
        },
        {
          icon: 'fas fa-hands-helping',
          bold: 'Community members helping each other.',
          text: 'Globally through our course message boards and conferences, and locally through self-organized practice and study groups. This year the course offers the chance to make tax deductive donations to our own Nonprofit arm, The Compassion Course Foundation, Inc. specifically designed so our community can support our community.',
        },
      ],
    },

    cta: {
      heading: 'Questions? Want to Get Involved?',
      para: 'If you have any questions or would like to contact us for any reason, we welcome your communication.',
      gratitude: 'With warmth and gratitude,',
      gratitudeTeam: 'The Compassion Course Team',
      email: 'coursecoordinator@nycnvc.org',
      phone: '(646) 201-9226',
      phoneHref: 'tel:+16462019226',
      registerBox: {
        heading: 'Not Yet Registered?',
        text: 'Join 50,000+ people who have taken this journey toward more compassionate living.',
        buttonText: 'Register for the Course',
        linkText: 'Learn more about the course',
        linkHref: '/learn-more',
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DONATE PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  donate: {
    hero: {
      eyebrow: 'Support the Mission',
      heading: 'Help Keep Compassion Accessible',
      description:
        'The Compassion Course has always been committed to accessibility \u2014 ensuring that cost is never a barrier to learning the skills of compassionate living. Your donation helps sustain this mission for 50,000+ participants across 120+ countries.',
      buttonText: 'Donate via PayPal',
      buttonUrl:
        'https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=HJLF9W2DWJE7L',
      footerLinks: [
        { text: 'Volunteer instead', href: '/volunteer' },
        { text: 'Learn about the course', href: '/learn-more' },
      ],
    },

    whyItMatters: {
      title: 'Where Your Support Goes',
      cards: [
        {
          icon: 'fas fa-unlock-alt',
          heading: 'Keeping the Course Accessible',
          text: 'Accessibility is a founding value. Your donation ensures that anyone who wants to learn the skills of compassionate living can do so, regardless of their financial situation.',
        },
        {
          icon: 'fas fa-language',
          heading: 'Translation into 20 Languages',
          text: 'Dedicated volunteer teams translate and facilitate the course worldwide. Donations support the infrastructure, tools, and coordination that make this possible.',
        },
        {
          icon: 'fas fa-globe-americas',
          heading: 'Community Infrastructure',
          text: 'Monthly conferences, the Global Compassion Network, practice groups, mentoring programs, and digital tools like the AI Compassion Mentor all need ongoing support.',
        },
      ],
    },

    stats: [
      { number: '50,000+', label: 'Participants Worldwide' },
      { number: '120+', label: 'Countries Reached' },
      { number: '20', label: 'Languages Available' },
      { number: '14', label: 'Years of Impact' },
    ],

    cta: {
      heading: 'Every Contribution Makes a Difference',
      text: 'Whether large or small, your donation directly supports the spread of compassion education around the world.',
      buttonText: 'Donate Now',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED / CROSS-PAGE CONTENT
  // ═══════════════════════════════════════════════════════════════════════════
  shared: {
    donateBanner: {
      heading: 'Support Compassion Education',
      text: 'Your donation helps keep the course accessible to anyone in the world.',
      buttonText: 'Make a Donation',
      buttonLink: '/donate',
    },
    donateCard: {
      icon: 'fas fa-heart',
      heading: 'Make a Donation',
      text: 'Your financial support helps keep the course accessible',
      linkText: 'Donate now',
      linkHref: '/donate',
    },
  },
} as const;
