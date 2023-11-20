import scaffoldConfigFile from './config-scaffolder.js';

export default async function ({projectRoot, vcs, visibility, projectType, tests}) {
  await scaffoldConfigFile(projectRoot, projectType, visibility, tests, vcs.owner);

  return {
    devDependencies: ['@travi/travis-lint'],
    scripts: {'disabled:lint:travis': 'travis-lint .travis.yml'},
    badges: {
      status: {
        ...'Public' === visibility && {
          ci: {
            img: `https://img.shields.io/travis/com/${vcs.owner}/${vcs.name}/master.svg`,
            link: `https://travis-ci.com/${vcs.owner}/${vcs.name}`,
            text: 'Build Status'
          }
        }
      }
    },
    nextSteps: [
      ...'Private' === visibility
        ? [{summary: `Add Travis-CI badge from https://travis-ci.com/${vcs.owner}/${vcs.name} to README.md`}]
        : []
    ]
  };
}
