const fs = require('fs');
const util = require('util');
const chalk = require('chalk');
const generator = require('yeoman-generator');
const BaseGenerator = require('generator-jhipster/generators/generator-base');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');

const genUtils = require('../utils');
const packagejs = require('../../package.json');

const JhipsterAuditEntityGenerator = generator.extend({});
util.inherits(JhipsterAuditEntityGenerator, BaseGenerator);

module.exports = JhipsterAuditEntityGenerator.extend({

  initializing: {
    readConfig() {
      this.entityConfig = this.options.entityConfig;
      this.jhAppConfig = this.getJhipsterAppConfig();
      if (!this.jhAppConfig) {
        this.error('Can\'t read .yo-rc.json');
      }
    },
    checkDBType() {
      if (this.jhAppConfig.databaseType !== 'sql' && this.jhAppConfig.databaseType !== 'mongodb') {
        // exit if DB type is not SQL or MongoDB
        this.abort = true;
      }
    },

    displayLogo() {
      if (this.abort) {
        return;
      }
      this.log(chalk.white(`Running ${chalk.bold('JHipster Entity Audit')} Generator! ${chalk.yellow(`v${packagejs.version}\n`)}`));
    },

    validate() {
      // this shouldnt be run directly
      if (!this.entityConfig) {
        this.env.error(`${chalk.red.bold('ERROR!')} This sub generator should be used only from JHipster and cannot be run directly...\n`);
      }
    },

    getEntitityNames() {
      const existingEntities = [];
      let existingEntityNames = [];
      try {
        existingEntityNames = fs.readdirSync('.jhipster');
      } catch (e) {
        this.log(`${chalk.red.bold('ERROR!')} Could not read entities, you might not have generated any entities yet. I will continue to install audit files, entities will not be updated...\n`);
      }

      existingEntityNames.forEach((entry) => {
        if (entry.indexOf('.json') !== -1) {
          const entityName = entry.replace('.json', '');
          existingEntities.push(entityName);
        }
      });
      this.existingEntities = existingEntities;
    }
  },

  prompting() {
    if (this.abort) {
      return;
    }

    // don't prompt if data are imported from a file
    if (this.entityConfig.useConfigurationFile === true && this.entityConfig.data && typeof this.entityConfig.data.enableEntityAudit !== 'undefined') {
      this.enableAudit = this.entityConfig.data.enableEntityAudit;

      if (typeof this.config.get('auditFramework') !== 'undefined') {
        this.auditFramework = this.config.get('auditFramework');
      } else {
        this.auditFramework = 'custom';
      }
      return;
    }

    const done = this.async();
    const entityName = this.entityConfig.entityClass;
    const prompts = [{
      type: 'confirm',
      name: 'enableAudit',
      message: `Do you want to enable audit for this entity(${entityName})?`,
      default: true
    }];

    this.prompt(prompts).then((props) => {
      this.props = props;
      // To access props later use this.props.someOption;
      this.enableAudit = props.enableAudit;
      this.auditFramework = this.config.get('auditFramework');
      done();
    });
  },
  writing: {
    updateFiles() {
      if (this.abort) {
        return;
      }
      if (!this.enableAudit) {
        return;
      }

      // read config from .yo-rc.json
      this.baseName = this.jhAppConfig.baseName;
      this.packageName = this.jhAppConfig.packageName;
      this.packageFolder = this.jhAppConfig.packageFolder;
      this.clientFramework = this.jhAppConfig.clientFramework;
      this.clientPackageManager = this.jhAppConfig.clientPackageManager;
      this.buildTool = this.jhAppConfig.buildTool;

      // use function in generator-base.js from generator-jhipster
      this.angularAppName = this.getAngularAppName();

      // use constants from generator-constants.js
      const javaDir = `${jhipsterConstants.SERVER_MAIN_SRC_DIR + this.packageFolder}/`;
      const resourceDir = jhipsterConstants.SERVER_MAIN_RES_DIR;
      this.javaTemplateDir = 'src/main/java/package';

      if (this.entityConfig.entityClass) {
        this.log(`\n${chalk.bold.green('I\'m updating the entity for audit ')}${chalk.bold.yellow(this.entityConfig.entityClass)}`);

        const entityName = this.entityConfig.entityClass;
        const jsonObj = this.entityConfig.data;
        this.changelogDate = this.entityConfig.data.changelogDate || this.dateFormatForLiquibase();
        genUtils.updateEntityAudit.call(this, entityName, jsonObj, javaDir, resourceDir, true);
      }
    },
    updateConfig() {
      if (this.abort) {
        return;
      }
      this.updateEntityConfig(this.entityConfig.filename, 'enableEntityAudit', this.enableAudit);
    }
  },

  end() {
    if (this.abort) {
      return;
    }
    if (this.enableAudit) {
      this.log(`\n${chalk.bold.green('Entity audit enabled')}`);
    }
  }
});
