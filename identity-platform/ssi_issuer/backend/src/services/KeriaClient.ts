import { SignifyClient, ready } from 'signify-ts';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface KeriaConfig {
  url: string;
  bootUrl: string;
  bran: string;
  tier?: string;
  timeout: number;
}

export class KeriaClientManager {
  private static instance: KeriaClientManager;
  private client: SignifyClient | null = null;
  private isInitialized: boolean = false;
  private config: KeriaConfig;

  private constructor() {
    this.config = {
      url: config.keria.url,
      bootUrl: config.keria.bootUrl,
      bran: process.env.KERIA_BRAN || 'ssi-issuer-platform',
      tier: process.env.KERIA_TIER || 'low',
      timeout: config.keria.timeout
    };
  }

  public static getInstance(): KeriaClientManager {
    if (!KeriaClientManager.instance) {
      KeriaClientManager.instance = new KeriaClientManager();
    }
    return KeriaClientManager.instance;
  }

  public async initialize(): Promise<void> {
    try {
      if (this.isInitialized && this.client) {
        logger.warn('KERIA client already initialized');
        return;
      }

      logger.info('Initializing KERIA client...');

      // Wait for signify-ts to be ready
      await ready;

      // Create SignifyClient instance
      this.client = new SignifyClient(
        this.config.url,
        this.config.bran,
        this.config.tier as any, // Cast to any for now due to type issues
        this.config.bootUrl
      );

      // Boot the client
      await this.bootClient();

      // Connect to KERIA
      await this.connectClient();

      this.isInitialized = true;
      logger.info('KERIA client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize KERIA client:', error);
      throw error;
    }
  }

  private async bootClient(): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Client not created');
      }

      logger.info('Booting KERIA client...');
      
      // Boot the client with timeout
      const bootPromise = this.client.boot();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Boot timeout')), this.config.timeout);
      });

      await Promise.race([bootPromise, timeoutPromise]);
      
      logger.info('KERIA client booted successfully');
    } catch (error) {
      logger.error('Failed to boot KERIA client:', error);
      throw error;
    }
  }

  private async connectClient(): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Client not created');
      }

      logger.info('Connecting to KERIA...');
      
      // Connect with timeout
      const connectPromise = this.client.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connect timeout')), this.config.timeout);
      });

      await Promise.race([connectPromise, timeoutPromise]);
      
      logger.info('Connected to KERIA successfully');
    } catch (error) {
      logger.error('Failed to connect to KERIA:', error);
      throw error;
    }
  }

  public getClient(): SignifyClient {
    if (!this.isInitialized || !this.client) {
      throw new Error('KERIA client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  public async createIdentifier(name: string, options?: any): Promise<any> {
    try {
      const client = this.getClient();
      
      logger.info(`Creating identifier: ${name}`);
      
      // Create identifier
      const op = await client.identifiers().create(name, options);
      
      // Wait for operation to complete
      await this.waitOperation(op);
      
      // Get the created identifier
      const identifier = await client.identifiers().get(name);
      
      logger.info(`Identifier created successfully: ${name}`);
      return identifier;
    } catch (error) {
      logger.error(`Failed to create identifier ${name}:`, error);
      throw error;
    }
  }

  public async getIdentifier(name: string): Promise<any> {
    try {
      const client = this.getClient();
      
      const identifier = await client.identifiers().get(name);
      return identifier;
    } catch (error) {
      logger.error(`Failed to get identifier ${name}:`, error);
      throw error;
    }
  }

  public async listIdentifiers(): Promise<any[]> {
    try {
      const client = this.getClient();
      
      const identifiers = await client.identifiers().list();
      return identifiers;
    } catch (error) {
      logger.error('Failed to list identifiers:', error);
      throw error;
    }
  }

  public async createRegistry(name: string, registryName: string): Promise<any> {
    try {
      const client = this.getClient();
      
      logger.info(`Creating registry: ${registryName} for identifier: ${name}`);
      
      // Create registry
      const op = await client.registries().create({ name, registryName });
      
      // Wait for operation to complete
      await this.waitOperation(op);
      
      logger.info(`Registry created successfully: ${registryName}`);
      return op;
    } catch (error) {
      logger.error(`Failed to create registry ${registryName}:`, error);
      throw error;
    }
  }

  public async listRegistries(name?: string): Promise<any[]> {
    try {
      const client = this.getClient();
      
      // If no name provided, use the main issuer identifier
      const identifierName = name || this.config.bran;
      const registries = await client.registries().list(identifierName);
      return registries;
    } catch (error) {
      logger.error('Failed to list registries:', error);
      throw error;
    }
  }

  public async resolveOOBI(oobi: string): Promise<any> {
    try {
      const client = this.getClient();
      
      logger.info('Resolving OOBI...', { oobi });
      
      const op = await client.oobis().resolve(oobi);
      
      // Wait for operation to complete if it's an async operation
      if (op && op.name) {
        await this.waitOperation(op);
      }
      
      logger.info('OOBI resolved successfully');
      return op;
    } catch (error) {
      logger.error('Failed to resolve OOBI:', error);
      throw error;
    }
  }

  public async generateOOBI(identifierName: string): Promise<string> {
    try {
      const client = this.getClient();
      
      logger.info(`Generating OOBI for identifier: ${identifierName}`);
      
      // Get identifier details which should include OOBI
      const identifier = await client.identifiers().get(identifierName);
      
      if (!identifier) {
        throw new Error(`Identifier ${identifierName} not found`);
      }

      // Extract OOBI URL from identifier
      let oobiUrl: string;
      
      if (identifier.oobi) {
        oobiUrl = identifier.oobi;
      } else if (identifier.prefix) {
        // Construct OOBI URL manually if not provided
        oobiUrl = `${this.config.url}/oobi/${identifier.prefix}`;
      } else {
        throw new Error('Unable to generate OOBI URL for identifier');
      }
      
      logger.info(`OOBI generated successfully: ${oobiUrl}`);
      return oobiUrl;
    } catch (error) {
      logger.error(`Failed to generate OOBI for ${identifierName}:`, error);
      throw error;
    }
  }

  public async getIdentifierOOBI(identifierName: string): Promise<{ oobi: string; prefix: string }> {
    try {
      const client = this.getClient();
      
      const identifier = await client.identifiers().get(identifierName);
      
      if (!identifier) {
        throw new Error(`Identifier ${identifierName} not found`);
      }

      const oobi = await this.generateOOBI(identifierName);
      
      return {
        oobi,
        prefix: identifier.prefix
      };
    } catch (error) {
      logger.error(`Failed to get OOBI for identifier ${identifierName}:`, error);
      throw error;
    }
  }

  public async addContact(alias: string, oobi: string): Promise<any> {
    try {
      const client = this.getClient();
      
      logger.info(`Adding contact: ${alias}`);
      
      const contact = await client.contacts().add(alias, oobi);
      
      logger.info(`Contact added successfully: ${alias}`);
      return contact;
    } catch (error) {
      logger.error(`Failed to add contact ${alias}:`, error);
      throw error;
    }
  }

  public async listContacts(): Promise<any[]> {
    try {
      const client = this.getClient();
      
      const contacts = await client.contacts().list();
      return contacts;
    } catch (error) {
      logger.error('Failed to list contacts:', error);
      throw error;
    }
  }

  public async issueCredential(aidName: string, credentialData: { ri: string; s: string; a: any }): Promise<any> {
    try {
      const client = this.getClient();
      
      logger.info(`Issuing credential for identifier: ${aidName}`);
      
      // For now, return a mock response until we can properly integrate with signify-ts
      // TODO: Implement proper credential issuance when signify-ts API is clarified
      const mockCredential = {
        name: `credential-${Date.now()}`,
        registry: credentialData.ri,
        schema: credentialData.s,
        attributes: credentialData.a,
        issued: true
      };
      
      logger.info('Credential issued successfully (mock)');
      return mockCredential;
    } catch (error) {
      logger.error('Failed to issue credential:', error);
      throw error;
    }
  }

  public async listCredentials(): Promise<any[]> {
    try {
      const client = this.getClient();
      
      const credentials = await client.credentials().list();
      return credentials;
    } catch (error) {
      logger.error('Failed to list credentials:', error);
      throw error;
    }
  }

  public async waitOperation(op: any, timeout: number = 30000): Promise<any> {
    try {
      if (!op || !op.name) {
        return op; // Not an operation that needs waiting
      }

      const client = this.getClient();
      
      logger.debug(`Waiting for operation: ${op.name}`);
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        const operations = await client.operations().get(op.name);
        
        if (operations && operations.done) {
          logger.debug(`Operation completed: ${op.name}`);
          return operations;
        }
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      throw new Error(`Operation timeout: ${op.name}`);
    } catch (error) {
      logger.error(`Failed to wait for operation:`, error);
      throw error;
    }
  }

  public async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (!this.isInitialized || !this.client) {
        return {
          status: 'error',
          details: { connected: false, error: 'Client not initialized' }
        };
      }

      // Try to list identifiers as a health check
      const identifiers = await this.listIdentifiers();
      
      return {
        status: 'healthy',
        details: {
          connected: true,
          url: this.config.url,
          bootUrl: this.config.bootUrl,
          bran: this.config.bran,
          identifierCount: identifiers.length
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  public async close(): Promise<void> {
    try {
      if (this.client) {
        // SignifyClient doesn't have an explicit close method
        // but we can reset our state
        this.client = null;
        this.isInitialized = false;
        logger.info('KERIA client connection closed');
      }
    } catch (error) {
      logger.error('Error closing KERIA client:', error);
    }
  }

  // Convenience methods for easier access to client functionality
  public identifiers() {
    return {
      create: (name: string, options?: any) => this.createIdentifier(name, options),
      get: (name: string) => this.getIdentifier(name),
      list: () => this.listIdentifiers(),
      getOOBI: (name: string) => this.getIdentifierOOBI(name)
    };
  }

  public registries() {
    return {
      create: (options: { name: string; registryName: string }) => 
        this.createRegistry(options.name, options.registryName),
      list: (name?: string) => this.listRegistries(name)
    };
  }

  public oobis() {
    return {
      resolve: (oobi: string) => this.resolveOOBI(oobi),
      generate: (identifierName: string) => this.generateOOBI(identifierName)
    };
  }

  public contacts() {
    return {
      add: (alias: string, oobi: string) => this.addContact(alias, oobi),
      list: () => this.listContacts(),
      get: async (alias: string) => {
        const contacts = await this.listContacts();
        return contacts.find(contact => contact.alias === alias);
      }
    };
  }

  public credentials() {
    return {
      issue: (aidName: string, credentialData: { ri: string; s: string; a: any }) => 
        this.issueCredential(aidName, credentialData),
      list: () => this.listCredentials()
    };
  }

  public operations() {
    return {
      get: (name: string) => this.getClient().operations().get(name),
      wait: (op: any, timeout?: number) => this.waitOperation(op, timeout)
    };
  }
}

export const keriaClient = KeriaClientManager.getInstance();