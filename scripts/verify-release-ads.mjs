const buildType = process.argv[2] ?? process.env.BUILD_TYPE ?? 'release';
if (buildType === 'debug') {
  console.log('Debug build: Google sample rewarded ad ID is allowed.');
  process.exit(0);
}

const appId = process.env.ADMOB_APP_ID?.trim() ?? '';
const rewardedAdId = process.env.ADMOB_REWARDED_AD_ID?.trim() ?? '';
const appPattern = /^ca-app-pub-\d{16}~\d{10}$/;
const unitPattern = /^ca-app-pub-\d{16}\/\d{10}$/;
const googleSamplePublisher = '3940256099942544';
const errors = [];

if (!appPattern.test(appId)) errors.push('ADMOB_APP_ID is missing or is not a numeric ca-app-pub-<16 digits>~<10 digits> ID.');
if (!unitPattern.test(rewardedAdId)) errors.push('ADMOB_REWARDED_AD_ID is missing or is not a numeric ca-app-pub-<16 digits>/<10 digits> ID.');
if (appId.includes(googleSamplePublisher) || rewardedAdId.includes(googleSamplePublisher)) {
  errors.push('Google test/sample AdMob IDs are not allowed in a release build.');
}

const publisherId = (id) => id.match(/^ca-app-pub-(\d{16})/)?.[1] ?? null;
if (publisherId(appId) && publisherId(rewardedAdId) && publisherId(appId) !== publisherId(rewardedAdId)) {
  errors.push('ADMOB_APP_ID and ADMOB_REWARDED_AD_ID belong to different AdMob publishers. The app ID and rewarded unit must come from the same AdMob account.');
}

if (errors.length > 0) {
  console.error('Release Android build requires real AdMob secrets:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Release AdMob App ID and rewarded ad unit ID are configured.');
