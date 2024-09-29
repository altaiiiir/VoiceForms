#!/bin/bash

# At SVG, Netscope replaces the https certificate for any calls from apps to the internet on https.
# Since apps don't have the Netscope self-signed certificate in their default trusted root store, the call fails.

# This script will copy the root cert into the project directory so the app running in SAM local
# can trust the netscope self-signed certificate as a root certificate so that the https calls will succeed.

# This script assumes that developers have or DevOps has configured that the install-central-ca-certs.sh
# script has already been run to generate the root certs file.
# The script can be found in the devopsScripts repo at path: /netscope/install-central-ca-certs.sh

ROOT_CERTS_FILE_PATH="/Library/SVG/com.springventuregroup.certificate-authority-environment/root-certs.pem"

# if the root-certs.pem file does not exist, then exit with an error message
if [ ! -f $ROOT_CERTS_FILE_PATH ]; then
    echo "root-certs.pem file does not exist. Exiting..."
    echo "Please ensure that the install-central-ca-certs.sh script has been run to generate the root certs file."
    exit 1
fi

# if the root-certs.pem file exists, then copy it to the project directory
cp $ROOT_CERTS_FILE_PATH ./root-certs.pem
