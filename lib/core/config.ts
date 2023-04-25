import * as fs from 'fs';
import * as yaml from 'js-yaml';
import Ajv from "ajv";

/**
 * Configuration class for the solution.
 */
export class Config {
    /**
     * Instance  of Config
     */
    private static instance: Config;

    /**
     * Property of config
     */
    private _config: { [key: string]: any } = {};

    /**
     * Property of schema.
     */
    private _schema: { [key: string]: any } = {};

    /**
     * Constructor to load configuration.
     * 
     * @param schemaPath - File path of schema.
     */
    constructor(schemaPath?: string) {
        if (schemaPath) {
            this._schema = JSON.parse(fs.readFileSync(schemaPath).toString());
        }

        Config.instance = this;
    }

    /**
     * Gets the current configuration.
     * 
     * @returns The instance of Config.
     */
    public static get Current(): Config {
        return this.instance;
    }

    /**
     * Load the configuration file.
     * 
     * @param configPath - The config path.
     */
    public async Load(configPath: string) {
        let localConfig: any = yaml.load(fs.readFileSync(configPath, "utf8"));
        const config = this.validateConfig(localConfig);
        this._config = config;
    }

    /**
     * Validate the configuration inputs.
     * 
     * @param unparsedConfig - The configuration input.
     * @returns - The configuration input.
     */
    private validateConfig(unparsedConfig: any): any {
        let ajv = new Ajv();
        const isValid = ajv.validate(this._schema, unparsedConfig);

        if (!isValid) {
            throw new Error(`Validation Error. ${ajv.errorsText()}`)
        }

        return unparsedConfig;
    }

    /**
     * Read in property.
     * 
     * @param propertyName - Name of the property.
     * @returns Property value.
     */
    private readProperty<T>(propertyName : string) : T {
        return this._config[propertyName] as T;
    }

    /**
     * Gets the AWS account ID.
     */
    get AWSAccountID(): string {
        return this.readProperty<string>("AWSAccountID");
    }

    /**
     * Gets the AWS region.
     */
    get AWSRegion(): string {
        return this.readProperty<string>("AWSRegion");
    }

    /**
     * Gets the domain.
     */
    get Domain(): string {
        return this.readProperty<string>("Domain");
    }

    /**
     * Gets the networking properties.
     */
    get Networking(): Networking {
        return this.readProperty<Networking>("Networking");
    }

    /**
     * Gets the EKS properties.
     */
    get EKS(): EKS {
        return this.readProperty<EKS>("EKS");
    }

    /**
     * Gets the Immuta properties.
     */
    get Immuta(): Immuta {
      return this.readProperty<Immuta>("Immuta");
    }

    /**
     * Gets the Radiant Logic properties.
     */
    get RadiantLogic(): RadiantLogic {
      return this.readProperty<RadiantLogic>("RadiantLogic");
    }
}

/**
 * Networking properties.
 */
interface Networking {
  VpcId: string;
  SubnetA: string;
  SubnetB: string;
  MaxAZs: number;
}

/**
 * EKS properties.
 */
interface EKS {
  ClusterName: string;
  EKSAdminRole: string;
  EKSEndpointAccess: string;
  InstanceType: string;
  ClusterSize: number;
}

/**
 * Immuta properties.
 */
interface Immuta {
  Deploy: boolean;
  ChartVersion: string;
  ImmutaVersion: string;
  ImageTag: string;
  Instance: Instance;
  Database: Database;
  Query: Query;
}

/**
 * Instance proerties.
 */
interface Instance {
  Username: string;
  Password: string;
}

/** 
 * Database properties
 */
interface Database {
  ImmutaDBPassword: string;
  ImmutaDBSuperUserPassword: string;
  ImmutaDBReplicationPassword: string;
  ImmutaDBPatroniApiPassword: string;
}

/**
 * Query properties.
 */
interface Query {
  ImmutaQEPassword: string;
  ImmutaQESuperUserPassword: string;
  ImmutaQEReplicationPassword: string;
  ImmutaQEPatroniApiPassword: string;
}

/**
 * Radiant Logic properties.
 */
interface RadiantLogic {
  Deploy: boolean;
  ZkImageTag: string;
  FidImageTag: string;
  License: string;
  RootPassword: string;
}
