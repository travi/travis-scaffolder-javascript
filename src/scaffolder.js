import scaffoldConfigFile from './config-scaffolder';

export default async function ({projectRoot, vcs, visibility, projectType, tests}) {
  await scaffoldConfigFile(projectRoot, projectType, visibility, tests, vcs.owner);

  return {
    devDependencies: ['travis-lint'],
    scripts: {'lint:travis': 'travis-lint .travis.yml'},
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
    }
  };
}
