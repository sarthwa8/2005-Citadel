// Portfolio content for every scannable body. EVERY personal detail here is a
// placeholder — fill them in manually. Structure mirrors build_context.md:
// planets are sections, moons are entries within a section. Moon `name` keys
// must match the moon names in planetConfigs.js (LANG, EXP_1, PROJ_1, ...).
export const BODIES = {

  HELIOS: {
    name:    '[YOUR_NAME]',
    tagline: '[YOUR_ONE_LINE_TAGLINE]',
  },

  GENESIS: {
    heading: 'About',
    bio:      '[BIO_PARAGRAPH]',
    location: '[YOUR_CITY], [YOUR_COUNTRY]',
    status:   '[CURRENT_STATUS]',
    scanRadius: 35,
  },

  SYNTHEX: {
    heading: 'Skills',
    scanRadius: 35,
    moons: [
      { name: 'LANG',  label: 'Languages',     items: ['[LANG_1]', '[LANG_2]', '[LANG_3]', '[LANG_4]'] },
      { name: 'AIML',  label: 'AI / ML',       items: ['[AIML_1]', '[AIML_2]', '[AIML_3]', '[AIML_4]'] },
      { name: 'WEB',   label: 'Web & Backend', items: ['[WEB_1]', '[WEB_2]', '[WEB_3]', '[WEB_4]'] },
      { name: 'TOOLS', label: 'Tools & Infra', items: ['[TOOL_1]', '[TOOL_2]', '[TOOL_3]', '[TOOL_4]'] },
    ],
  },

  EXPEDITION: {
    heading: 'Experience',
    scanRadius: 35,
    moons: [
      {
        name: 'EXP_1',
        label:       '[COMPANY_1]',
        role:        '[ROLE_1]',
        duration:    '[START_DATE_1] – [END_DATE_1]',
        description: '[DESCRIPTION_1]',
      },
      {
        name: 'EXP_2',
        label:       '[COMPANY_2]',
        role:        '[ROLE_2]',
        duration:    '[START_DATE_2] – [END_DATE_2]',
        description: '[DESCRIPTION_2]',
      },
      {
        name: 'EXP_3',
        label:       '[COMPANY_3]',
        role:        '[ROLE_3]',
        duration:    '[START_DATE_3] – [END_DATE_3]',
        description: '[DESCRIPTION_3]',
      },
    ],
  },

  CODEX: {
    heading: 'Projects',
    scanRadius: 40,
    moons: [
      {
        name: 'PROJ_1',
        label:       '[PROJECT_1_NAME]',
        tech:        '[PROJECT_1_TECH_STACK]',
        description: '[PROJECT_1_DESCRIPTION]',
        link:        '[PROJECT_1_LINK]',
      },
      {
        name: 'PROJ_2',
        label:       '[PROJECT_2_NAME]',
        tech:        '[PROJECT_2_TECH_STACK]',
        description: '[PROJECT_2_DESCRIPTION]',
        link:        '[PROJECT_2_LINK]',
      },
      {
        name: 'PROJ_3',
        label:       '[PROJECT_3_NAME]',
        tech:        '[PROJECT_3_TECH_STACK]',
        description: '[PROJECT_3_DESCRIPTION]',
        link:        '[PROJECT_3_LINK]',
      },
      {
        name: 'PROJ_4',
        label:       '[PROJECT_4_NAME]',
        tech:        '[PROJECT_4_TECH_STACK]',
        description: '[PROJECT_4_DESCRIPTION]',
        link:        '[PROJECT_4_LINK]',
      },
      {
        name: 'PROJ_5',
        label:       '[PROJECT_5_NAME]',
        tech:        '[PROJECT_5_TECH_STACK]',
        description: '[PROJECT_5_DESCRIPTION]',
        link:        '[PROJECT_5_LINK]',
      },
    ],
  },

  ACADEMY: {
    heading: 'Education',
    scanRadius: 35,
    moons: [
      {
        name: 'EDU_1',
        label:  '[INSTITUTION_1]',
        degree: '[DEGREE_1]',
        field:  '[FIELD_OF_STUDY_1]',
        period: '[YEAR_FROM_1] – [YEAR_TO_1]',
        detail: '[EDU_DETAIL_1]',
      },
      {
        name: 'EDU_2',
        label:  '[INSTITUTION_2]',
        degree: '[DEGREE_2]',
        field:  '[FIELD_OF_STUDY_2]',
        period: '[YEAR_FROM_2] – [YEAR_TO_2]',
        detail: '[EDU_DETAIL_2]',
      },
    ],
  },

  NOVARA: {
    heading: 'Contact',
    scanRadius: 35,
    email:    '[YOUR_EMAIL]',
    linkedin: '[LINKEDIN_URL]',
    github:   '[GITHUB_URL]',
    twitter:  '[TWITTER_HANDLE]',
    resume:   '[RESUME_PDF_URL]',
  },

  ASTEROIDS: [
    { label: '[ACHIEVEMENT_1_SHORT]', detail: '[ACHIEVEMENT_1_FULL_DESCRIPTION]' },
    { label: '[ACHIEVEMENT_2_SHORT]', detail: '[ACHIEVEMENT_2_FULL_DESCRIPTION]' },
    { label: '[ACHIEVEMENT_3_SHORT]', detail: '[ACHIEVEMENT_3_FULL_DESCRIPTION]' },
    { label: '[ACHIEVEMENT_4_SHORT]', detail: '[ACHIEVEMENT_4_FULL_DESCRIPTION]' },
  ],

  COMET: {
    heading: 'Currently Exploring',
    items: ['[CURRENT_TOPIC_1]', '[CURRENT_TOPIC_2]', '[CURRENT_TOPIC_3]', '[CURRENT_TOPIC_4]'],
  },

}
