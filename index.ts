import { Platform } from './src/platform';

async function run() {
  const platform = new Platform();
  await platform.login();
  await platform.getUserList();
  console.log('done');
}

run();
