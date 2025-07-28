# Setup Identity Platform

## Setup Agents
- `git clone https://github.com/hyperledger/identus-cloud-agent`
- Create `./identus-cloud-agent/infrastructure/local/.env-issuer`
    ```
    API_KEY_ENABLED=false
    AGENT_VERSION=1.36.1
    PRISM_NODE_VERSION=2.4.1
    PORT=8000
    NETWORK=identus
    VAULT_DEV_ROOT_TOKEN_ID=root
    PG_PORT=5432
    ```
- Create `./identus-cloud-agent/infrastructure/local/.env-verifier`
    ```
    API_KEY_ENABLED=false
    AGENT_VERSION=1.36.1
    PRISM_NODE_VERSION=2.4.1
    PORT=9000
    NETWORK=identus
    VAULT_DEV_ROOT_TOKEN_ID=root
    PG_PORT=5433
    ```
- Run Issuer
    ```
    ./infrastructure/local/run.sh -n issuer -b -e ./infrastructure/local/.env-issuer -p 8000 -d "$(ip addr show $(ip route show default | awk '/default/ {print $5}') | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)"
    ```
- The Issuer API endpoint http://localhost:8000/cloud-agent/
- Run Verifier
    ```
     ./infrastructure/local/run.sh -n verifier -b -e ./infrastructure/local/.env-verifier -p 9000 -d "$(ip addr show $(ip route show default | awk '/default/ {print $5}') | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)"
    ```
- The Verifier API endpoint http://localhost:9000/cloud-agent/
