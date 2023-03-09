import * as fs from 'fs';
import * as yaml from 'js-yaml';
import Ajv from "ajv";

export class Config {
    private static instance: Config;
    private _config: { [key: string]: any } = {};
    private _schema: { [key: string]: any } = {};

    constructor(schemaPath?: string) {
        if (schemaPath) {
            this._schema = JSON.parse(fs.readFileSync(schemaPath).toString());
        }

        Config.instance = this;
    }

    public static get Current(): Config {
        return this.instance;
    }
    public async Load(configPath: string) {
        let localConfig: any = yaml.load(fs.readFileSync(configPath, "utf8"));
        const config = this.validateConfig(localConfig);
        this._config = config;
    }

    private validateConfig(unparsedConfig: any): any {
        let ajv = new Ajv();
        const isValid = ajv.validate(this._schema, unparsedConfig);

        if (!isValid) {
            throw new Error(`Validation Error. ${ajv.errorsText()}`)
        }

        return unparsedConfig;
    }

    private readProperty<T>(propertyName : string) : T {
        return this._config[propertyName] as T;
    }

    get AWSAccountID(): string {
        return this.readProperty<string>("AWSAccountID");
    }

    get AWSRegion(): string {
        return this.readProperty<string>("AWSRegion");
    }

    get Domain(): string {
        return this.readProperty<string>("Domain");
    }

    get Networking(): Networking {
        return this.readProperty<Networking>("Networking");
    }

    get EKS(): EKS {
        return this.readProperty<EKS>("EKS");
    }

    get Immuta(): Immuta {
      return this.readProperty<Immuta>("Immuta");
    }

    get RadiantLogic(): RadiantLogic {
      return this.readProperty<RadiantLogic>("RadiantLogic");
    }
}

interface Networking {
  VpcId: string;
  SubnetA: string;
  SubnetB: string;
  MaxAZs: number;
}

interface EKS {
  EKSAdminRole: string;
  EKSEndpointAccess: string;
  InstanceType: string;
  ClusterSize: number;
}

interface Immuta {
  Deploy: boolean;
  ChartVersion: string;
  ImmutaVersion: string;
  ImageTag: string;
  Instance: Instance;
  Database: Database;
  Query: Query;
}

interface Instance {
  Username: string;
  Password: string;
}

interface Database {
  ImmutaDBPassword: string;
  ImmutaDBSuperUserPassword: string;
  ImmutaDBReplicationPassword: string;
  ImmutaDBPatroniApiPassword: string;
}

interface Query {
  ImmutaQEPassword: string;
  ImmutaQESuperUserPassword: string;
  ImmutaQEReplicationPassword: string;
  ImmutaQEPatroniApiPassword: string;
}

interface RadiantLogic {
  Deploy: boolean;
  ZkImageTag: string;
  FidImageTag: string;
  License: string;
  RootPassword: string;
}
