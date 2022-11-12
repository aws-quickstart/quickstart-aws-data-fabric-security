import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { MainStack } from '../lib/main';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';
import { Config } from '../lib/core/config';

const app = new cdk.App();
Aspects.of(app).add(new AwsSolutionsChecks({ 
  verbose: true,
  reports: true
}));

async function Main() {
  new Config().Load(`./config/dev.yaml`).then(_f => {

    new MainStack(app, "DataFabricStack", {
      env: {
        account: Config.Current.AWSAccountID,
        region: Config.Current.AWSRegion
      },
    });
  });
  
}

Main();