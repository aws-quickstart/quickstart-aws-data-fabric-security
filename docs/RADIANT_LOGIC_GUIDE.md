The purpose of this guide it to provide additional instructions to get started with Radiant Logic. For more advanced instructions and implementations, please refer to the [Radiant Logic Documentation](https://support.radiantlogic.com/hc/en-us).

## Table of Content
- [Identity Sources](#identity-sources)
  - [Adding an LDAP Store](#adding-an-ldap-store)
  - [Adding a Database Store](#adding-a-database-store)
  - [Adding a Custom Store](#adding-a-custom-store)
- [Global Identity](#global-identity)
  - [Create a Global Identity Project](#create-a-global-identity-project)
  - [Add an Identity Source to Project](#add-an-identity-source-to-project)
  - [Upload and Sync Data Sources](#upload-and-sync-data-sources)
  - [View Global Identities](#view-global-identities)

## Identity Sources
Radiant Logic supports multiple data sources from LDAP (eg. Active Directory), DB (eg. MySQL), and Custom data store types (eg. REST API).

### Adding an LDAP Store
1. Click on **Settings** => **Server Backend** => **LDAP Data Source** => **Add**
2. Fill out the **Add LDAP Data Source** form 
3. Click on **Save**

### Adding a Database Store
1. Click on **Settings** => **Server Backend** => **DB Data Source** => **Add**
2. Fill out the **Add DB Data Source** form 
3. Click on **Save**

### Adding a Custom Store
1. Click on **Settings** => **Server Backend** => **Custom Data Source** => **Add Custom**
2. Fill out the **Add Custom Data Source** form 
3. Click on **Save**

## Global Identity
Global Identity is a feature within Radiant Logic that allows you to correlate users from various identity sources and generates a Global Profile that defines the final view of the correlated identity sources.

Steps to create a global identity:
1. Create a global identity project
2. Add an identity source to the project
3. Upload and sync the data sources in the project

### Create a Global Identity Project
1. Click on **Wizards** => **Global Identity Builder** => **New Project**
2. Complete the **Project** form
3. On the right side, add the Custom Attributes you are interested in including as part of the Global Profile
  1. Input your Attribute value in the text field and select **Add Custom Attribute** for each custom attribute
4. Click on **Save**

### Add an Identity Source to Project
1. Click on **Add Identity Source**
2. Complete the Identity Source form
3. Click on **Save**
4. In **Mapping Definitions**, click on *Auto* to auto map attributes
5. Click **OK** when the warning pops up
6. Click on **Save** and **Save** again

### Upload and Sync Data Sources
1. Click on **Upload/Sync** in the Global Identity Project
2. Click on **Upload All** (Note: You can use Bulk Upload or Single Upload)
  1. On successful sync, the Status should be in FINISHED state

### View Global Identities
1. In the global profile, click on **Identities Browser**