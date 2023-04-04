import json, subprocess, os

os.environ['PATH'] = '/opt/awscli:/opt/kubectl:/opt/helm:' + os.environ['PATH']
kubeconfig = '/tmp/kubeconfig'

def lambda_handler(event, context):
    print('Start Lambda function')
    
    region = os.environ.get('AWS_REGION')
    role_arn = os.environ.get('CLUSTER_ADMIN_ROLE')
    cluster_name = os.environ.get('CLUSTER_NAME')
    install_file = os.environ.get('LAMBDA_SOURCE_FILE')
    os.environ['KUBECONFIG'] = kubeconfig

    # Configure kubeconfig to EKS cluster
    cmd = [ 'aws', 'eks', 'update-kubeconfig',
        '--role-arn', role_arn,
        '--region', region,
        '--name', cluster_name,
        '--kubeconfig', kubeconfig
    ]

    subprocess.check_call(cmd)
    
    # Run Immuta install commands
    subprocess.call(install_file)
    print('End Lambda function')

    return {
        'statusCode': 200,
        'body': json.dumps('Successful Lambda response')
    }
