const translations = {
  en: {
    welcome: 'Welcome to Zanira BuildLink',
    booking_created: 'Booking created successfully',
    booking_confirmed: 'Booking confirmed',
    payment_successful: 'Payment successful',
    fundi_on_way: 'Fundi is on the way',
    job_completed: 'Job completed successfully',
    verification_pending: 'Your verification is pending',
    verification_approved: 'Verification approved',
    verification_rejected: 'Verification rejected',
    insufficient_balance: 'Insufficient balance',
    invalid_credentials: 'Invalid credentials',
    unauthorized_access: 'Unauthorized access',
    not_found: 'Resource not found',
    server_error: 'Internal server error',
    subscription_expired: 'Your subscription has expired',
    feature_not_available: 'Feature not available in your plan'
  },
  sw: {
    welcome: 'Karibu Zanira BuildLink',
    booking_created: 'Uhifadhi umefanywa kwa mafanikio',
    booking_confirmed: 'Uhifadhi umethibitishwa',
    payment_successful: 'Malipo yamefanikiwa',
    fundi_on_way: 'Fundi yuko njiani',
    job_completed: 'Kazi imekamilika kwa mafanikio',
    verification_pending: 'Uthibitishaji wako unasubiri',
    verification_approved: 'Uthibitishaji umeidhinishwa',
    verification_rejected: 'Uthibitishaji umekataliwa',
    insufficient_balance: 'Salio halijatoshea',
    invalid_credentials: 'Maelezo ya kuingia si sahihi',
    unauthorized_access: 'Ufikiaji usioidhinishwa',
    not_found: 'Rasilimali haija patikana',
    server_error: 'Hitilafu ya ndani ya seva',
    subscription_expired: 'Usajili wako umeisha muda',
    feature_not_available: 'Kipengele hakipatikani kwenye mpango wako'
  }
};

export const translate = (key, language = 'en') => {
  return translations[language]?.[key] || translations.en[key] || key;
};

export const i18nMiddleware = (req, res, next) => {
  const language = req.headers['accept-language']?.split(',')[0]?.substring(0, 2) || 'en';
  req.language = ['en', 'sw'].includes(language) ? language : 'en';

  req.t = (key) => translate(key, req.language);

  next();
};

export const translateResponse = (key, language) => {
  return translate(key, language);
};

export default { translate, i18nMiddleware, translateResponse };
