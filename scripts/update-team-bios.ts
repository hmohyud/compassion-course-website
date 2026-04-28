/**
 * One-time migration script to update team member bios in Firestore
 * to match the exact descriptions from compassioncourse.org/team-members.
 *
 * Run this from the admin dashboard browser console or as a standalone script.
 *
 * Usage (from browser console while logged in as admin):
 *   1. Navigate to the admin page
 *   2. Open browser console
 *   3. Paste this script's updateBios object
 *   4. Run: await updateAllBios()
 *
 * OR run via: npx ts-node scripts/update-team-bios.ts
 */

// Map of member name → updated bio text (matching compassioncourse.org exactly)
// NOTE: Thom Bond and Clara Moisello are intentionally excluded (leave as-is)
const BIO_UPDATES: Record<string, { bio: string; role?: string }> = {
  'Antonio Espinoza': {
    role: 'Compassion Course Spanish Team Leader, Assistant Director, NYCNVC, Assistant Facilitator, NYCNVC',
    bio: "As an Assistant Director at NYCNVC Antonio's communication and outreach work has played a major role in our mission of sharing NVC around the world.\nAntonio is currently a Discovery Weekend Facilitator, Integration Program Graduate, Leadership Program participant and a principle member of the Spanish Translation and Coordination team for The Compassion Course Online.\nAntonio's ability to both learn and practice NVC serves as a model and as an inspiration for all those who work with him.",
  },
  'Doreen Poulin': {
    role: 'Compassion Course Assistant Coordinator, Assistant Facilitator, NYCNVC',
    bio: "Doreen dedicated much of her life to helping people of all ages communicate more effectively in her career as a speech-language pathologist in hospital, private, and special education settings.\nThe desire to improve her own communication skills brought her to NYCNVC in 2013. She completed the NYCNVC Integration Program, and has gone on to facilitate multiple weekend programs, and co-facilitate NYCNVC Practice Groups.\nSince February 2019, she has been a Core Team member and a Course Coordinator for the Compassion Course. Her value for purpose and meaning are met with her involvement in the development and coordination of NYCNVC programs and her role as Thom's executive assistant.\nDoreen sees that as she continues to practice living with needs-based consciousness, her ability to connect to herself and others, to find understanding and acceptance, and to communicate authentically brings more harmony into her life. Sharing this way of living with others brings her hope for more peace on earth, one empathetic interaction at a time.",
  },
  'Gabriele Vana': {
    role: 'German Language Translation Team Leader, Lead Facilitator, Translation from English Into German',
    bio: "Gabriele has been studying Nonviolent Communication intensely since 2006. Her teachers have been: Gabriel Gößnitzer (Austria), Nada Ignjatovic-Savic (Serbia), Robert Gonzales (USA), John Kinyon (USA), Thom Bond (USA), Gina Lawrie (GB), Jeff Brown (USA), Wes Taylor (USA). One day seminar with Marshall B. Rosenberg at the University of Klagenfurt.\nShe has been giving public talks and facilitating workshops and practice groups since 2009. Gabriele holds a high value for connection to the life-serving energy and loves inner and outer peace.\nShe is very excited about contributing to the Compassion Online Course that enables so many people all over the world to have access to hearing and learning more about the idea of compassion. She is thrilled to be able to share what has been so beneficial in her own life with a larger community.",
  },
  'Sabine Bends': {
    bio: "Translator, student of The Work of Byron Katie and Nonviolent Communication. The question she constantly asks herself: What would Love do? She wishes to live from her heart and to others in every moment.\nSabine finds that the Compassion Online Course speaks exactly to these issues. The easy to follow guidelines through the basic concepts, the stories of everyday life and the vast variety of practices and exercises offer a wonderful framework to cultivate a loving attitude and encourage people to see for themselves what it is like to live and connect from the heart in every moment.",
  },
  'Shahinaz El Hennawi': {
    role: 'Compassion Course Arabic Team Leader, Assistant Facilitator',
    bio: "Shahinaz el Hennawi is a co-active coach from the Coaching Training Institute – USA. She has over ten years experience in projects related to peacebuilding. She is an active peacemaker through programs and her leadership of groups and circles, including a practice group on NVC from people of both Islamic and Christian backgrounds.\nShahinaz has studied and worked in USA, Europe, Asia and Central America. She holds undergraduate and graduate degrees from the University for Peace.\nShahinaz discovered NVC in 2010 during her time in Austria. She found it to be such an enriching experience, she decided to take her learning forward and integrate it in her life and home country Egypt. In New York she created a partnership with Thom Bond and NYCNVC to bring NVC to the Arab speaking World. Today Shahinaz is the principle coordinator and Associate Facilitator for the 2014 Compassion Course Arabic Translation Team.",
  },
  'Dina Ali': {
    role: 'Compassion Course Arabic Team Translator, Assistant Facilitator',
    bio: 'Dina Ali is a Website Editor in French, Arabic and English at the Bibliotheca Alexandrina since 2008, and a Translator since 2005.\nDina had her first introduction to Nonviolent Communication through Shahinaz El-Hennawi. Together, they launched "Shams Women" to spread love and compassion, and support individuals in their path to self-development and inner peace. Dina joined Ahl El-Heta (The Neighborhood Community), an initiative to combat religious tension, and Welad El-Balad, an anti-sexual harassment campaign. With "Shams Women", they started a group to study Marshall Rosenberg\u2019s book Nonviolent Communication: a Language of Life and try to bring it to daily practice. She is now part of The Compassion Course 2014 Arabic Translation Team, dedicated to bring NVC to Egypt and our other Arabic speaking neighbors.',
  },
  'Kholoud Said': {
    bio: "Kholoud Said works as Website Editor at the Bibliotheca Alexandrina, and a Translator, Researcher, and Civil Society Trainer and Consultant. Kholoud is also a Political, Civil Society and Social Media Activist, with a special interest in gender issues, decentralization, advocacy, networking and awareness. She has a BA in English Literature and is currently pursuing her MA in Comparative Literature.\nWith the Egyptian Revolution, Kholoud noticed the danger of polarization and became part of a group to study Marshall Rosenberg's book Nonviolent Communication: A Language of Life, and try to apply its concepts in her daily life. The Group aspires to widen the circle and spread awareness on the importance of NVC and its significance in today's Egypt through The 2014 Compassion Course Arabic Translation Project.",
  },
  'Yasmine Arafa': {
    bio: "Yasmine Arafa has a law degree (LLB) from the University of Alexandria, Egypt. As the research associate of the vice rector, University for Peace, she has taken part in projects as a researcher and evaluation consultant working in academic and field research as well as multinational conflict resolution and peace studies projects.\nCurrently she\u2019s the coordinator of \u201CWomen and Democratic Transition in Egypt\u201D a Dialogue Forum seeking to advance the political participation and involvement of Egyptian citizens and emphasizing the importance of constructive Dialogue.\nYasmine's interest in Nonviolent Communication rose from her focus on conflict resolution and peace studies, and was sustained by her participation in a group to study Marshall Rosenberg's book Nonviolent Communication: A Language of Life. Today, as part of the 2014 Compassion Course Arabic Translation Team, she hopes to disseminate this work to larger groups.",
  },
  'Celeste De Vita': {
    bio: "Celeste hails from Argentina and serves as the lead translator for El Curso de Compasion. She discovered NVC in 2013, when she attended a practice group held by Ronnie Housheer from www.cnvargentina.com.ar. That same year she discovered the Compassion Course. In 2014 she got her Psychology degree in UBA (Universidad de Buenos Aires) and since then she has benefited from her increasing practice of empathy and observation, both very important tools to her professional practice.\nWith Ronnie's support Celeste facilitated introductory NVC workshops in Ecoaldea Velatropa and for Social Organizations and Community Culture Program of the Ministry of National Culture.\nSince she finished the Compassion Course, her wish to give back something for the precious tools she had learned, moved her to offer her help as a translator to create the Spanish Compassion Course.\nIn this moment, she\u2019s happy to support her spanish-speaker fellows in having access to a Course as transformative as this is.",
  },
  'Angélica Maeireizo·Tokeshi': {
    bio: "Angélica has been joyfully volunteering her time as a proofreader of the Spanish translation for the Compassion Course. She discovered NVC in 2012 when diving with curiosity into deep emotional waters. She has embraced her soul calling to share hope since being introduced to the depths of the heart while doing her postgrad at Waseda University in 2005; then having more than 10 years of lecturing and introducing Biophilic Architecture and researching on Mindful Urbanism. She has been a consultant on social projects and worked in public affairs. She has also facilitated Restorative Justice & Forgiveness Workshops in her birthplace of Lima, Peru.\nShe considers it an honor to be a pioneering part of this heart-connected adventure in partnership with Thom (and the team), introducing these practical spiritual principles as tools to the Spanish Audience.",
  },
  'Mustafa Tülü': {
    bio: "Besides facilitating, Mustafa does the technical side of the Compassion Course, such as the website, preparation and delivery of e-mails.\nHe comes from a technical background. Since 1986, he has been analyzing people\u2019s business needs and implementing software/systems that could meet these needs. Besides his computer engineering degree, he is also a PMP certified project manager. While he was working at a university, he taught project management courses at the undergraduate level, he volunteered at PMI Turkey, and most recently he was the president of the association in 2019.\nAt every stage of his life, understanding people and himself has been a prerequisite for doing his job.\nHe met nonviolent communication in 2015, received an introductory training in 2017 and annual training in 2017-2018. He had the distinct chance to learn from late Robert Gonzales in his EURO LIFE program and online sessions throughout COVID pandemic. Nowadays he is following Yoram Mozenson\u2019s \u201CTeaching and Embodying NVC Year Course\u201D.\nThe Compassion Course became a resource that he noticed right after the annual training. He joined immediately, and was very impressed by its content and setting. He and Nihal had a longing to deepen in non-violent communication, and they decided to work on Tarabya Practice Evenings, inspired by the course. Since then they have gone through the course once by themselves, and have been repeating and sharing the course for the last two years.",
  },
  'Nihal Artar': {
    bio: "Nihal studied Communication Sciences at university. After working for TRT television for a while, she retired from the logistics industry. She is interested in all aspects of communication, be it symbolic, behavioral, verbal and cognitive. Her vulnerability and pursuit of her needs for acceptance, belonging and integrity introduced her to Nonviolent Communication. In addition to Nonviolent Communication, Astrology, Family Constellation, Empathic Coaching are among her works.\nHer interest in Nonviolent Communication started by participating in circles opened by her friends between 2015-17. In 2017, she received annual training under the leadership of Vivet Alevi. Afterwards, she attended the trainings and circles of many of her friends who were interested in nonviolent communication, became trainer and progressed towards being a trainer. After a 2-day workshop given by Yoram Mozenson in Turkey, she participated in his annual program titled \u201CEmbodying and Teaching Nonviolent Communication on the Road to Become a Trainer\u201D opened in the Netherlands. She attended the workshops of Liv Larsson, Sarah Peyton and Stephan Seibert.\nDuring their yearly training, they were paired with Mustafa T\u00FCl\u00FC as empathy buddies. Since then, they have been doing joint projects. Introducing the Compassion Course into their lives started with their desire to practice the course together. This desire led them to meet Thom Bond.\nShe attended the Compassion Course 3 times. In addition to organizing the course in Turkish with Mustafa, they also organize Compassion Course Practice meetings as an appendix to the course. Their Compassion Course learning community is growing day by day with course and practice meetups.",
  },
  'Leticia Penteado': {
    bio: "Born in 1981 and Graduated in Law and Education, with a postgraduate degree in Transpersonal Psychology. Since 2010, Leticia has been facilitating conversations \u2014 within individuals, between individuals or between individuals and the collectivities to which they belong \u2014 using what she has learned from her own life experience as well as what she gathered from her extensive training in translation, Nonviolent Communication, Mediation, Restorative Justice, Transpersonal Therapy, Systemic Constellations and Sociocracy, among other paths to connection and deeper consciousness. She is also an anarchist, a feminist and a writer. Co-founder of Conex\u00E3o Emp\u00E1tica, Festival da Empatia and Comunidade Colar (a community for the practice of empathy and NVC) and co-author of the Applied NVC method.\nLeticia has been enthusiastically following the Compassion Course since 2016 \u2014 first as a student, then as a group facilitator and, finally, as part of the Portuguese team, mainly as lead translator \u2014 rejoicing in the opportunity of extending the access to this beautiful resource to Portuguese speakers. She\u2019s also internationally known for her chocolate candy and her very snug hugs.",
  },
  'Diana de Hollanda': {
    bio: "Author of the poetry book Dois que n\u00E3o amor (7 Letras, 2007), and the novel O Homem dos Patos (7 Letras, 2013; awarded a grant by the Petrobras Cultural program). Certified Meditation, Compassion and Mindfulness Teacher by the MMTCP (University of California, Berkeley), as well as by the Neurocognitive model by BMT (Mindfulness Centre of Excellence, London). Since 2010 she has been researching and practicing Mindfulness and Insight Meditation as writing, which was the subject of her master thesis Por uma literatura da plena aten\u00E7\u00E3o, in 2012, as well as her doctorate thesis Escrita da aten\u00E7\u00E3o plena: Escrita do Insight, in 2019. She lived in meditative self-retreat, isolated in the mountains, undergoing distance training by the german monk Bhante Pyiadhammo, in the Flow program, for 11 months (from April/2012 to March/2013). More recently, in 2019, she was in an immersion in the Sumedharama Monastery, in Portugal, during her doctorate in the University of Lisbon, which inspired her to write the novel Di\u00E1rio do Mosteiro.\nDiana has been following the Compassion Course since the 2017\u2019s edition; she is a facilitator and a member of the Portuguese team, mainly proofreading and preparing the texts (she\u2019s the reason the messages in Portuguese look just as good as the ones in English). She is also cofounder of the community Comunidade Enra\u00EDza, which combines Mindfulness, Meditation and NVC practices.",
  },
  'Igor Savitsky': {
    bio: "Igor Savitsky is a white cisgendered male born in 1982. Father of two, he works as a federal attorney and in sharing what he has learned from Nonviolent Communication, Systemic Constellations and Transpersonal Psychology, as well as his experiences with masculinity, ecovillages, circle processes, conflict resolution and restorative justice. Graduated in Law and Computer Engineering, with a postgraduate degree in Transpersonal Psychology. Passionate about therapies, technology and History, he enjoys swimming and sails whenever he can.\nCo-founder of Conex\u00E3o Emp\u00E1tica and co-author of the Applied NVC Method. Igor took the Compassion Course for the first time in 2019, an experience which meant a leap in his compassive practices, and collaborating with the Portuguese team as \u201Cthe tech guy\u201D, among other things, fills his heart with gratitude for the opportunity to spread the gift of compassion to a larger community. Renowned for his wide smile and his lovely lame jokes.",
  },
  'Adam Kusio': {
    role: 'Coordinator of the Polish Edition of the Polish Compassion Course',
    bio: "He has 18 years of corporate experience and is in a moment of life turn. He is a trainer, mediator and facilitator of Restorative Circles. He combines all these roles in the spirit of NVC (Nonviolent Communication) created by Marshall Rosenberg.\nHe facilitates Restorative Circles, practice groups and individual sessions. He supports developing organizations which allow their employees to be engaged and responsible.\nA husband and dad of two daughters, he is constantly looking for ways to build constructive relationships based on voluntariness.\nFascinated with the clarity and precision of presenting key notions of the nonviolence and practical character of the course, he organized the Polish edition in 2019. He led three year-long practice groups around the course material.",
  },
  'Agnes Kowalski': {
    bio: "She came across Marshall B. Rosenberg's NVC for the first time when her son was two and was becoming more and more autonomous. Together with his autonomy, their family life was becoming more and more stormy. After she came across M. Rosenberg's idea, nothing was the same. Relationships which were important to her become more profound and colorful. After eight years this process is still in progress. For her Nonviolent Communication is feeling deep from the heart, being in connection with the source of life. From this connection, comes action, making conscious choices, enriching one's own life and the surrounding world.\nAgnes is very happy that she can contribute to the Polish edition of the course with her editing and proofreading skills. In this way, she can express her gratitude for the guiding she received and participate in dissemination of the idea of Nonviolent Communication in Poland. She is able to connect people who try to understand the other, to look beyond the surface of human actions, who also want to accompany children with an openness, curiosity, acceptance and tenderness. She hopes that her children will be able to enter adult life as people who have a beautiful interior, they are conscious of what is around them and at the same time they are connected with what is alive in them.",
  },
  'Magdalena Macińska': {
    bio: 'She is a translator and interpreter of English and French into Polish. When working on a text, she is very sensitive to the beauty of the Polish language and attentive to the spirit of the original. In 2019, Marie Miyashiro\'s book "The Empathy Factor" was published in her translation.\nThrough Nonviolent Communication she got fascinated with the practice of empathy and deep listening. She completed the NVC mediation immersion training, foundations of dialogue by the Nansen Centre and Empathy Circles facilitation. She dreams of a world where each person can be supported in conflict.\nShe joined the team translating the course material into Polish, having interpreted the workshop of Dominic Barter in Poland. It has been an experience of rich collaboration.\nCurrently, she is part of the project, the name of which is inspired by the title of Marshall Rosenberg\'s book "What You Say Can Change the World". The aim is to allow people in Poland to listen to each other around the difficult social topics. The structure of dialogue circles and empathy circles enables the participants to see their humanity amid differences.\nIn her free time she travels, writes and tells stories. Wherever she is, she cannot imagine her day without reading a poem.',
  },
  'Sara Nuytemans': {
    role: 'Translator, Trainer, Supervisor and Coordinator of the Dutch Course',
    bio: "In 2012 Sara read Marshall Rosenberg's book Nonviolent Communication (NVC) and a lot of things fell into place for her. She learned the 'language' that brought and still brings her more awareness and connection with life. In 2016 she participated in Thom Bond's online course that has deepened her practice of the 'language', partly due to the many examples he has put in his course. She wanted to translate this course and share it with the Dutch-speaking world.\nThe online course Mededogen Als Weg is the result. In addition to this online course, she also gives offline basic NVC courses for associations, companies and individuals for several years now. She also helps people break patterns with hypnotherapy.",
  },
};

/**
 * To run this in the browser console:
 *
 * 1. Log in as admin
 * 2. Open DevTools console
 * 3. Run:
 *
 * const { collection, getDocs, query, where, doc, updateDoc, Timestamp } = await import('firebase/firestore');
 * const { db } = await import('./firebase/firebaseConfig');
 *
 * // Then paste the BIO_UPDATES object above and run:
 *
 * async function updateAllBios() {
 *   const teamRef = collection(db, 'teamMembers');
 *   const snapshot = await getDocs(query(teamRef, where('isActive', '==', true)));
 *   let updated = 0;
 *   for (const d of snapshot.docs) {
 *     const data = d.data();
 *     const update = BIO_UPDATES[data.name];
 *     if (update) {
 *       const fields = { bio: update.bio, updatedAt: Timestamp.now() };
 *       if (update.role) fields.role = update.role;
 *       await updateDoc(doc(teamRef, d.id), fields);
 *       console.log(`✅ Updated: ${data.name}`);
 *       updated++;
 *     }
 *   }
 *   console.log(`Done! Updated ${updated} members.`);
 * }
 *
 * await updateAllBios();
 */

export { BIO_UPDATES };
