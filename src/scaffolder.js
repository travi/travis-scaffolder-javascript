import writeYaml from '../third-party-wrappers/write-yaml';

export default async function ({projectRoot, vcs, visibility}) {
  await writeYaml(`${projectRoot}/.travis.yml`, {
    language: 'node_js',
    notifications: {email: false},
    install: ['npm install', 'gem install travis'],
    before_script: ['npm run greenkeeper:update-lockfile', 'npm ls >/dev/null'],
    after_script: 'npm run greenkeeper:upload-lockfile',
    ...'Public' === visibility && {after_success: 'npm run coverage:report'},
    env: {global: ['FORCE_COLOR=1', 'NPM_CONFIG_COLOR=always', 'GK_LOCK_COMMIT_AMEND=true']}
  });

  return {
    ...'Public' === visibility && {
      badge: {
        img: `https://img.shields.io/travis/${vcs.owner}/${vcs.name}.svg?branch=master`,
        link: `https://travis-ci.com/${vcs.owner}/${vcs.name}`,
        text: 'Build Status'
      }
    }
  };
}
