# Immuta Guide
The purpose of this guide it to provide additional instructions to get started with Immuta. For more advanced instructions and implementations, please refer to the [Immuta Documentation](https://documentation.immuta.com).

## Table of Content
- [Data Sources](#data-sources)
  - [Adding a Data Source](#adding-a-data-source)
- [Policies](#policies)
  - [Creating a Global Data Policy](#creating-a-global-data-policy)
  - [Creating a Global Subscription Policy](#creating-a-global-subscription-policy)
  - [Creating a Local Policy](#creating-a-local-policy)
- [GovCloud Region Support](#govcloud-region-support)

## Data Sources
Immuta supports the ability to connect to query-backed and object-based data sources. 

### Adding a Data Source
The following are steps to add a data source:
1. On the left side navigation, click on **Data Sources**
2. Click on **+ New Data Source**
3. Select the **Storage Technology** of your data source
4. Complete **Connection Information** of the data source
5. Test the connection
6. Complete the **Connection Population**
7. Complete the **Basic Information**
8. Opt to set up **Schema Monitoring** and **Advanced Options**

More details on data sources can be found here:
- [Query-backed Data Sources](https://documentation.immuta.com/4-connecting-data/creating-data-sources/storage-technologies/general/query-backed-tutorial/)
- [Object-backed Data Sources](https://documentation.immuta.com/4-connecting-data/creating-data-sources/storage-technologies/general/object-backed-tutorial/)

## Policies
Policies are managed and applied to data sources in Immuta to restrict access to data.

Types of policies defined in Immuta:
- Global Policies - applied to all data sources across an organization
  - Global Subscription Policies - applied to subscribers
  - Global Data Policies - applied to all data users
- Local Policies - applied to a specific data source

### Creating a Global Subscription Policy
1. On the left side navigation, click on **Policies**
2. Select **Subscription Policies**
3. Click on **+ Add Subscription Policy**
4. Complete the Global Subscription Policy Builder form
5. Click on **Create Policy**

Tutorial for [Global Policy Subscription](https://documentation.immuta.com/3-writing-global-policies-for-compliance/global-policy-builder/subscription-policy-tutorial/)

### Creating a Global Data Policy
1. On the left side navigation, click on **Policies**
2. Select **Data Policies**
3. Click on **+ Add Data Policy**
4. Complete the Global Data Policy Builder form
5. Click on **Create Policy**

Tutorial for [Global Data Policy](https://documentation.immuta.com/3-writing-global-policies-for-compliance/global-policy-builder/data-policy-tutorial/)

### Creating a Local Policy
1. On the left side navigation, click on **Data Sources**
2. Select the data source you would like to create a local policy for
3. Select **Policies**
4. Click on **+ New Policy**
5. Complete the Policy Builder form <br />
  Note: You will need to log into the users that have the attributes you need before Immuta can populate the attributes
6. Click on **Create**

Tutorial for [Local Policy](https://documentation.immuta.com/2022.4/4-connecting-data/managing-data-sources/local-policy-builder/)

## GovCloud Region Support
Immuta comes with standard regions support out of the box so you will need to set up advanced configuration to enable the service endpoints (eg. S3 data sources). Follow the steps below for GovCloud region support:
1. Go to **App Settings** on the left hand navigation
2. Expand **Advanced Settings**
3. Click on **Advanced Configuration**
4. Modify the **Advanced Configuration** textfield with the following:
  ```
  client:
    awsRegions:
      - us-gov-east-1
      - us-gov-west-1
  ```
5. Click **Save**

