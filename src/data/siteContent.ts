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
      videoSrc: '/videos/The Compassion Course Community Speaks.mp4',
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
        'Explore 12 core concepts from needs awareness to living compassion',
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
      videoSrc: '/videos/Gabi Vana discusses how the Compassion Course helped her get through her dog\'s passing.mp4',
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
          heading: '12 monthly Deep-Dive Sessions — Guided by our global leadership',
          description:
            'On the fourth Monday of every month, our featured guest trainer offers a specialized deep-dive session on one of the four weekly topics. Participants experience how a single NVC distinction can be applied in radically different contexts — learning moves from "understanding the idea" to "seeing how it lives in the world." This creates consistency of core principles with diversity of lived expression.',
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
        { en: 'English', native: 'English', url: '/' },
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
      videoSrc: '/videos/The faces and voices of the Compassion Course.mp4',
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
          icon: 'fas fa-chalkboard-user',
          heading: '12 Monthly Live Conferences with Thom Bond',
          text: 'Thom, along with guest trainers from around the globe, hosts 12 monthly 90-minute conferences via Zoom on the second Monday of each month. Each session includes review, deeper exploration of the material, and interactive Q&A. Conferences are also hosted in other languages by affiliated course leaders. All sessions are recorded and may be accessed at any time throughout the course.',
        },
        {
          number: 3,
          icon: 'fas fa-users',
          heading: 'Global Compassion Network',
          text: 'The online community where participants connect from around the globe. Ask questions, discuss course material, share successes and challenges. Access specialized discussion groups covering parenting, relationships, empathy skills, self-compassion, and workplace issues. Find practice groups, mentors, empathy buddies, practice partners, and empathy caf\u00E9s and circles. Create a personalized profile with credentials and connect with the worldwide community.',
        },
        {
          number: 4,
          icon: 'fas fa-bolt',
          heading: '12 monthly Deep-Dive Sessions — Guided by our global leadership',
          text: 'On the fourth Monday of every month:',
          bullets: [
            'Our featured guest trainer offers a specialized deep-dive session on one of the four weekly topics',
            'Participants experience how a single NVC distinction can be applied in radically different contexts',
            'Learning moves from "understanding the idea" to "seeing how it lives in the world"',
          ],
          outcomeHeading: 'This creates:',
          outcomes: [
            'Consistency of core principles',
            'Diversity of lived expression',
          ],
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
      practicesHeading: 'Practices for the Week',
      quote: {
        text: 'The hearing that is only in the ears is one thing. The hearing of understanding is another. But the hearing of the spirit is not limited to any one faculty, to the ear or the mind. Hence it demands emptiness of all of the faculties. And when the faculties are empty, the whole being listens. There is then a direct grasp of what is right there before you that can never be heard with the ear or understood with the mind.',
        author: 'Chuang-Tzu',
      },
      concept: {
        heading: 'The Concept',
        paragraphs: [
          'Empathy is the basic practice that brings me to compassion. It is ultimately quite simple, and quite challenging. As a child growing up, and for most of my adulthood, I learned to listen with my mind\u2026 often with a purpose other than connecting to the person I was with. As I listened to people, I would focus on the future\u2026 \u201CWhat can I say back?\u201D or \u201CWhat can I think of to fix this?\u201D \u2026 Other times I would go to the past, \u201CWhat does that remind me of?\u201D',
          'When I thought these things I became distracted from the moment, more disconnected and less able to understand what the other person was experiencing. Then I discovered empathy.',
          'Empathy is the exploration of our human experience\u2026 our feelings\u2026 our needs\u2026 our life energy trying to emerge and guide us. It is the mindful questioning, the wondering and the genuine curiosity about what we or someone else is going through.',
          'This may sound strange, but I have witnessed over and over again, that this search, or wondering, is the stuff of connection on a deeper plane and sometimes, even an opening of spiritual space.',
          'The ability to be present in this way challenges many of us 21st century humans, highly trained in thought\u2026 as opposed to simply listening. Often when we are trying to be empathic (even in situations where we are feeling compassionate), we may say things that do not connect us with the other person as well as empathy might.',
          'We may choose to have \u201Cnon-empathic\u201D forms of communication as part of our lives\u2026 and of course, many can serve us wonderfully. They\u2019re just NOT empathy. They tend to fill the space; they do not tend to open it up. Becoming aware of these \u201Cnon-empathic\u201D forms of communication can help make choices to have a deeper connection when we want it.',
        ],
      },
      examplesIntro: 'To illustrate, below is a quote\u2026 something we may hear from a friend, followed by some examples of habitual, \u201Cnon-empathic\u201D responses. This is not to say these forms of communication are \u201Cwrong\u201D. They\u2019re just not empathy. Do any of these responses sound familiar?',
      examplePrompt: '\u201CSometimes I just hate my job. My boss is such a control freak.\u201D',
      nonEmpathicExamples: [
        {
          heading: 'Comparing and One-upping',
          text: '\u201CYeah, mine too. MY boss is the worst. She makes going to work a living hell. I remember a time when\u2026\u201D',
          reflection: 'Often, when people share what\u2019s going on for them, it reminds us about our situation. We may, without thinking about it, share that experience. So think about it\u2026 Did we just change the subject? Are they telling us this to elicit our experience? Probably not.',
        },
        {
          heading: 'Educating and Advising',
          text: '\u201COh yeah, I know what you mean. You know there\u2019s this great book called How to Love a Boss that Stinks\u201D\u2026 or \u201CYeah, when my boss does that, I\u2019ve learned to \u2026\u201D or \u201CHave you ever tried speaking to the HR department?\u201D',
          reflection: 'When we hear of someone\u2019s pain, we may assume they want us to tell them how to deal with the situation. Are we doing this to understand what is alive in them or are we working on a fix? My friend Marshall Rosenberg told me he only gives advice when it is asked for in writing, notarized and in triplicate. It helps him stay more present. And of course, advice has a place in life\u2026 It\u2019s just not empathy.',
        },
        {
          heading: 'Discounting',
          text: '\u201CThat\u2019s nothing. In this economy, you should be thankful you even have a job.\u201D',
          reflection: 'We may have a \u201Cknee-jerk\u201D reaction to try to draw someone\u2019s attention to something else in an attempt to \u201Cmake them feel better\u201D. Can you recall a time when you received this kind of response and you thought to yourself, \u201COh yeah, that\u2019s so true. Thanks for that. I feel better now\u201D. I can\u2019t.',
        },
        {
          heading: 'Fixing and Counseling',
          text: '\u201COK. Calm down. Don\u2019t worry. We\u2019re gonna get through this. I know it feels bad now, but I\u2019m sure it will get better. These things always have a way of working themselves out.\u201D',
          reflection: 'When we hear another\u2019s pain, we can feel uncomfortable ourselves and want to somehow fix things. If we check in with ourselves\u2026 whose need is that about?',
        },
        {
          heading: 'Sympathizing',
          text: '\u201COh, you poor thing. I\u2019m so upset when I hear about that. I just hate that boss of yours.\u201D',
          reflection: 'Sympathy (the sharing of a feeling through an imagined shared experience) is different than empathy. It\u2019s kind of like responding to a drowning person by jumping into the water and drowning with them. Yes, it may let them know that you get what is going on for them. It\u2019s just not empathy.',
        },
        {
          heading: 'Data Gathering and Interrogating',
          text: '\u201CSo tell me, exactly what did he do? Has he done this before? Have you noticed a pattern here?\u201D',
          reflection: 'Data gathering is often a precursor to advising, the warm up to fixing it all. It may come from a sense of OUR curiosity or our discomfort with their pain. We may have a genuine interest, to be sure. It\u2019s just not empathy.',
        },
        {
          heading: 'Explaining and Defending',
          text: '\u201CWell, as a boss myself, I know sometimes we just need to crack the whip. He\u2019s probably under a lot of stress and doesn\u2019t really mean anything by it.\u201D',
          reflection: 'Sometimes WE are triggered by someone else\u2019s pain. This can result in what I call TTNRS: \u201Ctwo transmitters, no receivers syndrome\u201D. Sometimes we call it \u201Ca fight\u201D. It\u2019s certainly not empathy.',
        },
        {
          heading: 'Analyzing',
          text: '\u201CSo where else in your life does this show up? Have you ever considered that this is a pattern for you? Perhaps it\u2019s because of your unfulfilled relationship with your father.\u201D',
          reflection: 'Sometimes we are so interested in \u201Cgetting to the bottom of things\u201D that we forget about the top. Our urge to understand in order to fix or our discomfort with someone\u2019s pain can have us rushing to our brains for answers. No doubt, there are places in life where analyzing is important. It\u2019s just not empathy.',
        },
      ],
      empathyConclusion: [
        'I\u2019m sure none of us has ever said anything like these examples (heheheh *wry smile*). OK, I know I have, and likely will again. The difference now is that when I have the awareness of what I\u2019m doing, I have the choice to do something else\u2026 if I want to.',
        'I can recall times, before I developed my empathic skills and my trust in the power of empathy, when the experience of wanting to connect and not knowing how left me frustrated, confused and disconnected against my will.',
        'This is where empathy comes in. In the beginning it can be SOOOO hard to refrain from these habitual ways of thinking and speaking. Our \u201Crobot\u201D kicks in and away we go, like always.',
        'Now we have a chance to add a new way of being to our lives\u2026 a new skill to create a new level of connection\u2026 empathy. Shifting to this new focus on feelings and needs is rarely easy. I know for me, it is a life work\u2026 one that has given me some of the most beautiful moments of my life.',
      ],
      story: {
        heading: 'In Practice: \u201CThe Car, the Clubs and the Cab Driver\u201D',
        paragraphs: [
          'A few years back, when I was living in Manhattan, I loaned my car, a station wagon, to a friend who needed it to move into her new apartment. We had agreed that she would return it early that evening. That evening I waited to hear from her. I waited\u2026 and waited, and waited some more. No call, no car. I drifted to sleep waiting on my couch.',
          'At about 2:30 in the morning, I was awakened by a phone call. \u201CThom, I just finished moving and I just don\u2019t have the energy to return the car tonight.\u201D',
          'Still a bit groggy, I inquired, \u201CWhere did you leave it?\u201D',
          'She informed me that it was parked on a street in the meat packing district\u2026 with my golf clubs in plain sight in the back. Ten minutes later, after some serious self-empathy work (that\u2019s a story for another time), I was headed to rescue my car and my precious toys.',
          'I staggered out into the warm rainy night. After a seemingly endless effort, I found a cab. I climbed in, told him my destination and we headed out, along the edge of Manhattan Island, down the West Side Highway. As we drove along side the Hudson River, we passed the USS Intrepid, a decommissioned battleship that functions as a floating museum.',
          'The driver spoke. \u201CThe last time I saw that ship, I was stationed in Viet Nam.\u201D From my place in the back seat I could only see the cab driver\u2019s eyes reflected in the rearview mirror.',
          'We made eye contact in the pale gray light. I replied, \u201CThat must bring up quite a bit for you.\u201D',
          'After a pause he spoke. \u201CIt does.\u201D',
          'I listened into the silence that followed. More eye contact, more space. After a time, he spoke again. \u201CWhen we came back, everybody hated us.\u201D',
          'I sat quietly making space as the tires thumped rhythmically on the seams of the road, sounding eerily like a beating heart. Space for his pain, his need for being seen, for appreciation, for love. I watched the pain slowly seep into his occasional glance.',
          'I spoke. \u201CI imagine that was tough, risking your life like that. I bet it would have made a big difference to have gotten even some appreciation.\u201D',
          '\u201CYes\u2026 Yes, it would have.\u201D',
          'Still seeing only his eyes in the mirror, I watched as the tears slowly filled his eyes. We continued our ride, without speaking a word, as we rolled through the empty streets to our destination.',
          'A few minutes later we arrived. I reached through the little glass hatch and paid the fare\u2026 and with compassion and connection in my heart said a simple \u201Cthank you\u201D. I swung the door open and started on my way. From behind me, I heard the sound of the cab door opening. As I turned, there was my new found friend, with an outstretched hand and a look of pure relief in his eyes, walking toward me. \u201CThank you.\u201D We shook hands and parted.',
          'I will never forget that ride. Never.',
        ],
      },
      practices: [
        {
          heading: 'Practice 1 \u2014 Increase Your Awareness',
          text: 'See if you can notice yourself using any of the mentioned \u201Cnon-empathic\u201D, habitual forms of communication. Later, when you have some time and space, see if you can imagine what an \u201Cempathic\u201D response would be. What was that person feeling? What was that person needing, wanting to have more of, or yearning to experience? Check the feelings list and the needs list for the answer. Now imagine what you might say.',
        },
        {
          heading: 'Practice 2 \u2014 Play the Empathy/Non-Empathy Game',
          text: 'Work with a partner in person or on the phone. First, write down a quote, something you might say when you would want some empathy, like \u201CI\u2019m feeling really stressed about my finances.\u201D Say your quote to your partner and have them respond with any of the \u201Cnon-empathic\u201D forms of communication. Next, try saying the same quote again with your partner giving an empathic response. Then, switch roles. For this practice, it may be easier to start out with the simplest form of empathy, \u201CAre you feeling __________ (feeling from the feelings list) because you need more ___________ (need from the needs list).\u201D',
        },
      ],
    },

    sampleAppreciation: {
      badge: 'Sample Week 2',
      title: 'The Power of Appreciation',
      practicesHeading: 'Practices for the Week',
      quote: {
        text: 'The greatest of all gifts is the power to estimate things at their true worth.',
        author: 'Fran\u00E7ois de la Rochefoucauld',
      },
      concept: {
        heading: 'The Concept: More About Appreciation',
        sections: [
          {
            subheading: 'Appreciation versus Praise',
            paragraphs: [
              'As a child, I grew up hearing expressions like \u201Cgood boy\u201D or \u201Cnice job\u201D. These expressions of \u201Capproval\u201D were often nice to hear and yet, always left me wondering. What was \u201Cnice\u201D about that? It also left me a bit nervous. Does that mean I might not be \u201Cgood\u201D if I do something else?',
              'These were the instructions I received on how to be a human. It was the \u201Cpraise\u201D I received from the \u201Cpeople in charge\u201D. From this \u201Cpraise\u201D I learned that certain behaviors earned me the label of \u201Cgood\u201D. They also reminded me that I might lose that label if the \u201Cpeople in charge\u201D decided my behavior wasn\u2019t \u201Cgood\u201D.',
              'I have come to realize that many of the expressions of \u201Cpraise\u201D that I have received were often designed to get me to \u201Cbehave\u201D. Others were designed to let me know that someone appreciated my actions and was grateful for what I did.',
              'The second category felt different. These expressions touched me in a way that felt connecting and clear. These are the ones I want to understand and be part of. They were not \u201Cpraise\u201D; they were \u201Cappreciation\u201D.',
            ],
          },
          {
            subheading: 'Living in Appreciation',
            paragraphs: [
              'Using the skills we have learned in this course so far, we can experience a deeper, more satisfying experience of appreciation. Also, through language, we can share that experience with others.',
              'Inside myself, I can use the skills of feeling feelings and connecting them to my met needs, to notice the copious amounts of \u201Cmetness\u201D I am experiencing throughout my day. Right now, as I write these words, my brain is having thoughts, translating them into words, organizing them into sentences, helping my body type them into the message you are reading and helping me share this with you\u2026 Self-expression, mmmmmmm. All this while I am sitting in my office, which is clearly 30 degrees warmer than it is outside, while I\u2019m fully clothed, while I\u2019m fully rested, while my heart is pumping life through my body, while my lungs are bringing me fresh air, while the trees are helping make that fresh air, while this big blue ball of water, earth and life spins in space, while the sun gives us warmth and light\u2026 Comfort, security, care, well-being, peace of mind, communion\u2026 that\u2019s what I\u2019m talkin\u2019 about! I can notice this. I can feel this; I can see that there are thousands of things happening that are contributing to the \u201Cmetness\u201D of my needs. Simply summarized, the practice of appreciation makes my life and the lives of those around me more wonderful.',
            ],
          },
          {
            subheading: 'Receiving Appreciation',
            paragraphs: [
              'Some years ago, my partner and I had developed a practice of taking a few moments each day to share our appreciation for how we contribute to each other. In the beginning, it was a bit uncomfortable for me. After some self-empathy, I realized it was because when I was growing up, appreciation had usually come with some sense of \u201Capproval\u201D and \u201Cpower over\u201D and even engendered anxiety.',
              'With some practice I learned to receive appreciation like \u201Ca shower\u201D, as opposed to \u201Csustenance\u201D. Appreciation from others has become something that adds to my life, not something I depend on to feel OK about myself. This shift gives me a very different experience, one that is more choiceful and gratifying.',
              'I have also noticed that instead of only thinking about the things that we did, or that we do, when we specifically think about the needs that we contribute to for one another through our actions, our experience is even deeper and more satisfying.',
            ],
          },
        ],
      },
      story: {
        heading: 'In Practice: \u201CA Moving Experience\u201D',
        paragraphs: [
          'A number of years ago, when I was living on the Upper West Side of Manhattan, I was in my favorite book store, a Barnes and Noble on Broadway.',
          'I was lining up to get on the escalator, as is common in the city, and noticed a father and his three-year-old son approaching the moving staircase. The father was weighed down with a full day\u2019s payload of purchased goods, a stroller and his son trailing close behind. As \u201CDad\u201D got on the escalator, juggling his bounty, his son stood there frozen, struggling to find a way to step on and keep up with his rapidly descending dad. The little boy called out in a frightened, slightly quivering voice, \u201CDad?\u201D',
          'By the time his father noticed what was happening, he was hopelessly watching the space between them grow, from half way down the moving mass of metal stairs.',
          'Seeing this, I stepped up and held my hand out to the soon-to-be panicking little person at the top of the stairs. I spoke. \u201CHold my hand.\u201D He reached up. \u201CReady? Here we go.\u201D We stepped onto the machine together. And down we went.',
          'As the two of us reached the bottom and stepped onto solid ground, he looked up, straight into my eyes, let out the cutest little sigh of relief and said perhaps the most heartfelt little \u201Cthank you\u201D I have ever heard.',
          'It was so sincere and chock full of deep appreciation, I almost cried from the joy of this wonderful exchange. I feel warm right now recounting it. I could clearly see and feel what this meant to my little friend. His dad was pretty happy and relieved too. I owe it to my practice of compassion, that this seemingly \u201Clittle\u201D moment was so wonderful for me. Thanks to my ability to fully connect with this little guy\u2019s feelings and the \u201Cmetness\u201D of his needs in the moment\u2026 a moment I will appreciate forever.',
        ],
      },
      practices: [
        {
          heading: 'Practice 1 \u2014 Check In Again',
          text: 'As we did last time, write down a list of things that are happening and the needs that are being met in this very moment. For example, breathing/air, reading this/learning and growth, sitting in a building/security. This time, write down ten to twenty of them. How do you feel?',
        },
        {
          heading: 'Practice 2 \u2014 Appreciate Yourself',
          text: 'Write down three ways you contribute to your own life, three things that you do or have done that you enjoy. Then write down the needs you meet for yourself. Then look in the mirror and say, \u201CThank you.\u201D Note: It is difficult to do this without smiling.',
        },
        {
          heading: 'Practice 3 \u2014 Share an Appreciation',
          text: 'Think of something that someone said or did that contributed to your needs being met. Ask them if you could share something you appreciate with them. Then let them know what happened, how it felt and what need (or needs) it met. For example: \u201CI just want to let you know how much I appreciate your company at the movies last night\u2026 and for that matter all the times we\u2019ve spent together\u2026 the friendship, the fun and companionship you bring into my life makes such a difference to me. Thank you, really.\u201D You can do this in person, by phone, through an email or by writing a card.',
        },
      ],
    },

    whatMakesDifferent: {
      videoSrc: '/videos/The Compassion Course Community Speaks_ Deeper Conversations.mp4',
      imageAlt: 'Golden sunrise over misty green hills',
      heading: 'What Makes This Different',
      subtitle:
        "The Compassion Course is rigorous. It is challenging and approaches a year of gradual, real change.",
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
      comparison: {
        before: {
          label: 'Traditional Workshop',
          items: [
            { icon: 'fas fa-clock', text: '2-day intensive, then forgotten' },
            { icon: 'fas fa-user', text: 'Learn alone, practice alone' },
            { icon: 'fas fa-book', text: 'Theory without integration' },
            { icon: 'fas fa-dollar-sign', text: 'Expensive tuition required' },
            { icon: 'fas fa-language', text: 'English only' },
          ],
        },
        after: {
          label: 'The Compassion Course',
          items: [
            { icon: 'fas fa-calendar-check', text: '52 weeks of guided practice' },
            { icon: 'fas fa-users', text: 'Global community & empathy buddies' },
            { icon: 'fas fa-seedling', text: 'Habits formed through real life' },
            { icon: 'fas fa-heart', text: 'Accessible to everyone' },
            { icon: 'fas fa-globe-americas', text: '20 languages, 120+ countries' },
          ],
        },
      },
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
            'Yes. For an additional US$75, you can earn a Certificate of Completion by tracking your weekly progress and keeping a private journal throughout the year and submitting it for verification.',
        },
        {
          question: 'What is the cost? Is financial help available?',
          answer:
            'Standard tuition for Participants is US$240. If you can afford it, we ask that you pay this amount. Participants can also pay a reduced tuition of US$190. Tuition for the Leadership Track is the same, however it has prerequisites. Accessibility is a founding value of the course \u2014 the course is available to any inspired human, regardless of ability to pay. Alternative payment options are available, too.',
          linkText: 'Click here for financial aid information',
          linkUrl: 'https://nycnvc.org/financial-aid',
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
    team: {
      title: 'Meet the Team',
      description:
        'The Compassion Course is translated, facilitated, and supported by dedicated volunteer teams across communities around the world.',
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
              role: 'Compassion Course Spanish Team Leader, Assistant Director, NYCNVC, Assistant Facilitator, NYCNVC',
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
              role: 'German Language Translation Team Leader, Lead Facilitator, Translation from English Into German',
              photo: '/Team/GabrieleVana.png',
              bio: [
                'Gabriele has been studying Nonviolent Communication intensely since 2006. Her teachers have been: Gabriel G\u00F6\u00DFnitzer (Austria), Nada Ignjatovic-Savic (Serbia), Robert Gonzales (USA), John Kinyon (USA), Thom Bond (USA), Gina Lawrie (GB), Jeff Brown (USA), Wes Taylor (USA). One day seminar with Marshall B. Rosenberg at the University of Klagenfurt.',
                'She has been giving public talks and facilitating workshops and practice groups since 2009. Gabriele holds a high value for connection to the life-serving energy and loves inner and outer peace.',
                'She is very excited about contributing to the Compassion Online Course that enables so many people all over the world to have access to hearing and learning more about the idea of compassion. She is thrilled to be able to share what has been so beneficial in her own life with a larger community.',
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
                'Shahinaz el Hennawi is a co-active coach from the Coaching Training Institute \u2013 USA. She has over ten years experience in projects related to peacebuilding. She is an active peacemaker through programs and her leadership of groups and circles, including a practice group on NVC from people of both Islamic and Christian backgrounds.',
                'Shahinaz has studied and worked in USA, Europe, Asia and Central America. She holds undergraduate and graduate degrees from the University for Peace.',
                'Shahinaz discovered NVC in 2010 during her time in Austria. She found it to be such an enriching experience, she decided to take her learning forward and integrate it in her life and home country Egypt. In New York she created a partnership with Thom Bond and NYCNVC to bring NVC to the Arab speaking World. Today Shahinaz is the principle coordinator and Associate Facilitator for the 2014 Compassion Course Arabic Translation Team.',
              ],
              contact: 'arabic_coordinator@nycnvc.org',
            },
            {
              name: 'Dina Ali',
              role: 'Compassion Course Arabic Team Translator, Assistant Facilitator',
              photo: '/Team/DinaAli.png',
              bio: [
                'Dina Ali is a Website Editor in French, Arabic and English at the Bibliotheca Alexandrina since 2008, and a Translator since 2005.',
                'Dina had her first introduction to Nonviolent Communication through Shahinaz El-Hennawi. Together, they launched \u201CShams Women\u201D to spread love and compassion, and support individuals in their path to self-development and inner peace. Dina joined Ahl El-Heta (The Neighborhood Community), an initiative to combat religious tension, and Welad El-Balad, an anti-sexual harassment campaign. With \u201CShams Women\u201D, they started a group to study Marshall Rosenberg\u2019s book Nonviolent Communication: a Language of Life and try to bring it to daily practice. She is now part of The Compassion Course 2014 Arabic Translation Team, dedicated to bring NVC to Egypt and our other Arabic speaking neighbors.',
              ],
              contact: 'arabic_coordinator@nycnvc.org',
            },
            {
              name: 'Kholoud Said',
              role: 'Compassion Course Arabic Team Translator',
              photo: '/Team/KholoudSaid.png',
              bio: [
                'Kholoud Said works as Website Editor at the Bibliotheca Alexandrina, and a Translator, Researcher, and Civil Society Trainer and Consultant. Kholoud is also a Political, Civil Society and Social Media Activist, with a special interest in gender issues, decentralization, advocacy, networking and awareness. She has a BA in English Literature and is currently pursuing her MA in Comparative Literature.',
                "With the Egyptian Revolution, Kholoud noticed the danger of polarization and became part of a group to study Marshall Rosenberg's book Nonviolent Communication: A Language of Life, and try to apply its concepts in her daily life. The Group aspires to widen the circle and spread awareness on the importance of NVC and its significance in today's Egypt through The 2014 Compassion Course Arabic Translation Project.",
              ],
              contact: 'arabic_coordinator@nycnvc.org',
            },
            {
              name: 'Yasmine Arafa',
              role: 'Compassion Course Arabic Team Translator',
              photo: '/Team/YasmineArafa.png',
              bio: [
                'Yasmine Arafa has a law degree (LLB) from the University of Alexandria, Egypt. As the research associate of the vice rector, University for Peace, she has taken part in projects as a researcher and evaluation consultant working in academic and field research as well as multinational conflict resolution and peace studies projects.',
                'Currently she\u2019s the coordinator of \u201CWomen and Democratic Transition in Egypt\u201D a Dialogue Forum seeking to advance the political participation and involvement of Egyptian citizens and emphasizing the importance of constructive Dialogue.',
                "Yasmine's interest in Nonviolent Communication rose from her focus on conflict resolution and peace studies, and was sustained by her participation in a group to study Marshall Rosenberg's book Nonviolent Communication: A Language of Life. Today, as part of the 2014 Compassion Course Arabic Translation Team, she hopes to disseminate this work to larger groups.",
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
                'Celeste hails from Argentina and serves as the lead translator for El Curso de Compasion. She discovered NVC in 2013, when she attended a practice group held by Ronnie Housheer from www.cnvargentina.com.ar. That same year she discovered the Compassion Course. In 2014 she got her Psychology degree in UBA (Universidad de Buenos Aires) and since then she has benefited from her increasing practice of empathy and observation, both very important tools to her professional practice.',
                "With Ronnie's support Celeste facilitated introductory NVC workshops in Ecoaldea Velatropa and for Social Organizations and Community Culture Program of the Ministry of National Culture.",
                'Since she finished the Compassion Course, her wish to give back something for the precious tools she had learned, moved her to offer her help as a translator to create the Spanish Compassion Course. In this moment, she\u2019s happy to support her Spanish-speaker fellows in having access to a Course as transformative as this is.',
              ],
              contact: 'celeste.devita@gmail.com',
            },
            {
              name: 'Ang\u00E9lica Maeireizo\u00B7Tokeshi',
              role: 'Compassion Course Spanish Primary Proofreader',
              photo: '/Team/AngelicaMaeireizoTokeshi.png',
              bio: [
                'Ang\u00E9lica has been joyfully volunteering her time as a proofreader of the Spanish translation for the Compassion Course. She discovered NVC in 2012 when diving with curiosity into deep emotional waters. She has embraced her soul calling to share hope since being introduced to the depths of the heart while doing her postgrad at Waseda University in 2005; then having more than 10 years of lecturing and introducing Biophilic Architecture and researching on Mindful Urbanism. She has been a consultant on social projects and worked in public affairs. She has also facilitated Restorative Justice & Forgiveness Workshops in her birthplace of Lima, Peru.',
                'She considers it an honor to be a pioneering part of this heart-connected adventure in partnership with Thom (and the team), introducing these practical spiritual principles as tools to the Spanish Audience.',
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
                'Besides facilitating, Mustafa does the technical side of the Compassion Course, such as the website, preparation and delivery of e-mails. He comes from a technical background. Since 1986, he has been analyzing people\u2019s business needs and implementing software/systems that could meet these needs. Besides his computer engineering degree, he is also a PMP certified project manager. While working at a university, he taught project management courses at the undergraduate level, volunteered at PMI Turkey, and most recently was the president of the association in 2019.',
                'He met nonviolent communication in 2015, received an introductory training in 2017 and annual training in 2017\u20132018. He had the distinct chance to learn from late Robert Gonzales in his EURO LIFE program and online sessions throughout the COVID pandemic. Nowadays he is following Yoram Mozenson\u2019s \u201CTeaching and Embodying NVC Year Course\u201D.',
                'The Compassion Course became a resource that he noticed right after the annual training. He joined immediately, and was very impressed by its content and setting. He and Nihal had a longing to deepen in nonviolent communication, and decided to work on Tarabya Practice Evenings, inspired by the course. Since then they have gone through the course once by themselves, and have been repeating and sharing the course for the last two years.',
              ],
            },
            {
              name: 'Nihal Artar',
              role: 'Facilitator and Translator',
              photo: '/Team/NihalArtar.png',
              bio: [
                'Nihal studied Communication Sciences at university. After working for TRT television for a while, she retired from the logistics industry. She is interested in all aspects of communication, be it symbolic, behavioral, verbal and cognitive. In addition to Nonviolent Communication, Astrology, Family Constellation, and Empathic Coaching are among her works.',
                'Her interest in Nonviolent Communication started by participating in circles between 2015\u201317. In 2017, she received annual training under the leadership of Vivet Alevi. Afterwards, she attended the trainings and circles of many friends who were interested in nonviolent communication. She attended workshops by Yoram Mozenson, Liv Larsson, Sarah Peyton, and Stephan Seibert.',
                'She attended the Compassion Course 3 times. In addition to organizing the course in Turkish with Mustafa, they also organize Compassion Course Practice meetings as an appendix to the course. Their Compassion Course learning community is growing day by day with course and practice meetups.',
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
                'Born in 1981 and Graduated in Law and Education, with a postgraduate degree in Transpersonal Psychology. Since 2010, Leticia has been facilitating conversations \u2014 within individuals, between individuals or between individuals and the collectivities to which they belong \u2014 using what she has learned from her own life experience as well as what she gathered from her extensive training in translation, Nonviolent Communication, Mediation, Restorative Justice, Transpersonal Therapy, Systemic Constellations and Sociocracy, among other paths to connection and deeper consciousness.',
                'Co-founder of Conex\u00E3o Emp\u00E1tica, Festival da Empatia and Comunidade Colar (a community for the practice of empathy and NVC) and co-author of the Applied NVC method. Leticia has been enthusiastically following the Compassion Course since 2016 \u2014 first as a student, then as a group facilitator and, finally, as part of the Portuguese team, mainly as lead translator \u2014 rejoicing in the opportunity of extending the access to this beautiful resource to Portuguese speakers.',
              ],
              contact: 'conexaoempatica@gmail.com',
            },
            {
              name: 'Diana de Hollanda',
              role: 'Facilitator',
              photo: '/Team/DianadeHollanda.png',
              bio: [
                'Author of the poetry book Dois que n\u00E3o amor (7 Letras, 2007), and the novel O Homem dos Patos (7 Letras, 2013; awarded a grant by the Petrobras Cultural program). Certified Meditation, Compassion and Mindfulness Teacher by the MMTCP (University of California, Berkeley), as well as by the Neurocognitive model by BMT (Mindfulness Centre of Excellence, London).',
                'Since 2010 she has been researching and practicing Mindfulness and Insight Meditation as writing. She lived in meditative self-retreat, isolated in the mountains, for 11 months (from April 2012 to March 2013). Diana has been following the Compassion Course since the 2017 edition; she is a facilitator and a member of the Portuguese team, mainly proofreading and preparing the texts.',
                'She is also cofounder of the community Comunidade Enra\u00EDza, which combines Mindfulness, Meditation and NVC practices.',
              ],
              contact: 'escritadoinsight@gmail.com',
            },
            {
              name: 'Igor Savitsky',
              role: 'Tech Support',
              photo: '/Team/IgorSavitsky.png',
              bio: [
                'Born in 1982, Igor works as a federal attorney and in sharing what he has learned from Nonviolent Communication, Systemic Constellations and Transpersonal Psychology, as well as his experiences with masculinity, ecovillages, circle processes, conflict resolution and restorative justice. Graduated in Law and Computer Engineering, with a postgraduate degree in Transpersonal Psychology. Passionate about therapies, technology and History.',
                'Co-founder of Conex\u00E3o Emp\u00E1tica and co-author of the Applied NVC Method. Igor took the Compassion Course for the first time in 2019, an experience which meant a leap in his compassive practices, and collaborating with the Portuguese team as \u201Cthe tech guy,\u201D among other things, fills his heart with gratitude for the opportunity to spread the gift of compassion to a larger community.',
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
                'He has 18 years of corporate experience and is in a moment of life turn. He is a trainer, mediator and facilitator of Restorative Circles. He combines all these roles in the spirit of NVC (Nonviolent Communication) created by Marshall Rosenberg.',
                'He facilitates Restorative Circles, practice groups and individual sessions. He supports developing organizations which allow their employees to be engaged and responsible. A husband and dad of two daughters, he is constantly looking for ways to build constructive relationships based on voluntariness.',
                'Fascinated with the clarity and precision of presenting key notions of the nonviolence and practical character of the course, he organized the Polish edition in 2019. He led three year-long practice groups around the course material.',
              ],
              contact: 'kontakt@praktykawspolczucia.pl',
            },
            {
              name: 'Agnes Kowalski',
              role: 'Editor and Proofreader',
              photo: '/Team/AgnesKowalski.png',
              bio: [
                "She came across Marshall B. Rosenberg's NVC for the first time when her son was two and was becoming more and more autonomous. Together with his autonomy, their family life was becoming more and more stormy. After she came across M. Rosenberg's idea, nothing was the same. Relationships which were important to her become more profound and colorful. After eight years this process is still in progress. For her Nonviolent Communication is feeling deep from the heart, being in connection with the source of life. From this connection, comes action, making conscious choices, enriching one's own life and the surrounding world.",
                'Agnes is very happy that she can contribute to the Polish edition of the course with her editing and proofreading skills. In this way, she can express her gratitude for the guiding she received and participate in dissemination of the idea of Nonviolent Communication in Poland. She hopes that her children will be able to enter adult life as people who have a beautiful interior, they are conscious of what is around them and at the same time they are connected with what is alive in them.',
              ],
              contact: 'agnes.kowalski@gmail.com',
            },
            {
              name: 'Magdalena Maci\u0144ska',
              role: 'Translator',
              photo: '/Team/MagdalenaMacinska.png',
              bio: [
                'She is a translator and interpreter of English and French into Polish. When working on a text, she is very sensitive to the beauty of the Polish language and attentive to the spirit of the original. In 2019, Marie Miyashiro\'s book "The Empathy Factor" was published in her translation.',
                'Through Nonviolent Communication she got fascinated with the practice of empathy and deep listening. She completed the NVC mediation immersion training, foundations of dialogue by the Nansen Centre and Empathy Circles facilitation. She dreams of a world where each person can be supported in conflict.',
                'She joined the team translating the course material into Polish, having interpreted the workshop of Dominic Barter in Poland. Currently, she is part of a project inspired by the title of Marshall Rosenberg\'s book "What You Say Can Change the World." The aim is to allow people in Poland to listen to each other around the difficult social topics. In her free time she travels, writes and tells stories. Wherever she is, she cannot imagine her day without reading a poem.',
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
                "In 2012 Sara read Marshall Rosenberg's book Nonviolent Communication and a lot of things fell into place. She learned the 'language' that brought and still brings her more awareness and connection with life. In 2016 she participated in Thom Bond's online course that deepened her practice, partly due to the many examples he has put in his course. She wanted to translate this course and share it with the Dutch-speaking world.",
                'The online course Mededogen Als Weg is the result. In addition to this online course, she also gives offline basic NVC courses for associations, companies and individuals. She also helps people break patterns with hypnotherapy.',
              ],
            },
          ],
        },
      ],
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
      videoSrc: '/videos/Compassion Course participants shares how her marraige has grown closer.mp4',
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
  // SHARED / CROSS-PAGE CONTENT
  // ═══════════════════════════════════════════════════════════════════════════
  shared: {
    donateBanner: {
      heading: 'Support Compassion Education',
      text: 'Your donation helps keep the course accessible to anyone in the world.',
      buttonText: 'Make a Donation',
      buttonLink: 'https://compassioncf.com/donate',
    },
    donateCard: {
      icon: 'fas fa-heart',
      heading: 'Make a Donation',
      text: 'Your financial support helps keep the course accessible',
      linkText: 'Donate now',
      linkHref: 'https://compassioncf.com/donate',
    },
  },
} as const;
