
Demo of credential issuance and proof presentation using Aries Cloud Agent - Python
Step 1: Preparation of Demo Setup
Open a terminal to bring up von-network.

git clone https://github.com/bcgov/von-network
cd von-network
./manage up
When the network is up and running we can open a browser and access the ledger by http://localhost:9000.

Then we bring out another four terminals, one for each cloud agent.

git clone https://github.com/kctam/acapy-alice-bob
cd acapy-alice-bob/demo
# on each terminal
./run_demo faber
./run_demo acme
./run_demo alice
./run_demo bob
Something is predefined on this demo

The Faber agent registers a public DID into the ledger, and creates a Schema “Degree Schema” and a Credential Definition based on this Schema
The Acme agent registers a public DID into the ledger
The public DIDs of Faber and Acme are written into the ledger. So are the schema and credential definition.
Both Alice and Bob agent do not register a public DID
We are using OpenAPI to send instruction to each agent. The port predefined in the client code is

Faber: 8021
Acme: 8041
Alice: 8031
Bob: 8051
Open browser using http://localhost:<port> for each agent in order to access the OpenAPI. With these four browsers, we are ready for the demonstration.

Obtain the DIDs of both Faber and Acme, and the schema and credential definition from the agent terminals.

Zoom image will be displayed

Agent terminals for Faber and Acme, where we see their public DIDs, and the schema and credential definition.
For record purpose, here is the record of my setup. You will have your own value.

Faber Public DID: VA3GvaAZRZwrH4dDtVWd6E
Acme Public DID: 6K4zPhKFCQvXaACos7mvMb
Schema ID of “degree schema”: VA3GvaAZRZwrH4dDtVWd6E:2:degree schema:70.19.14
Credential Definition ID for “degree schema”: VA3GvaAZRZwrH4dDtVWd6E:3:CL:8:default
The schema Faber creates has the following information

name: “degree schema”
version: x.y.z (all are randomly generated)
attributes: name, date, degree and average
Step 2: Credential Issuance
Before any communication happens, a secured connection is established between two agents. In this demo, Faber first establishes one connection to Alice, and one to Bob. After that Faber issues credential to them with their own personal data. Finally Alice and Bob will see the credential in their own wallets.

Step 2.1: Faber establishes connections to Alice and Bob
First, Faber establishes a connection to Alice.

Faber Agent: POST /connections/create-invitation, from the response get the invitation object (from { to })
Alice Agent: POST /connections/receive-invitation with the invitation object
Check both Faber Agent and Alice Agent by GET /connections and both are in Active status
Zoom image will be displayed

As an example, Faber establishes a connection to Alice.
Similar for connection between Faber to Bob.

Faber Agent: POST /connections/create-invitation, from the response get the invitation object (from { to })
Bob Agent: POST /connections/receive-invitation with the invitation object
Check both Faber Agent and Bob Agent by GET /connections and both are in Active status.
Here is the connections on all agents. Note that Faber now has two connections, one for Alice and one for Bob.

Zoom image will be displayed

Connections seen in Faber Agent
Zoom image will be displayed

Connection seen in Alice Agent
Zoom image will be displayed

Connection seen in Bob Agent
For record purpose, here is the record of connection IDs, from Faber’s perspective.

Faber’s connection ID to Alice: 1ed0ce65–9ed6–43ed-8836-fa2cdbcbdf27
Faber’s connection ID to Bob: 798a16bc-c792–4414–887b-d6d5accad3b1
We will use this in next step.

Step 2.2: Faber issue credentials to Alice and Bob, with proper individual data
The credential which Faber to create and issue requires the following three pieces of information

Connection ID (where Faber sends to)
Credential Definition ID (Faber created before)
Attributes for the credential receiver
The attributes for Alice is

name: Alice Smith
date: 2018–05–28
degree: Maths
average: 5
The attributes for Bob is

name: Bob Johnson
date: 2019–05–31
degree: Physics
average: 3
(In case you have not logged down, you can use GET /connections and get the Connection ID for Alice and for Bob. Then use GET /credential-definitions/created to obtain the Credential Definition ID.)

Here are the Credential to be sent to Alice and Bob. Replace the Connection ID, Credential Definition ID, and the attributes detail according to your own demo.

Credential to Alice

{
  "connection_id": "1ed0ce65-9ed6-43ed-8836-fa2cdbcbdf27",
  "cred_def_id": "VA3GvaAZRZwrH4dDtVWd6E:3:CL:8:default",
  "credential_proposal": {
    "@type": "did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/issue-credential/1.0/credential-preview",
    "attributes": [
      {
        "name": "name",
        "value": "Alice Smith"
      },
      {
        "name": "date",
        "value": "2018-05-28"
      },
      {
        "name": "degree",
        "value": "Maths"
      },
      {
        "name": "average",
        "value": "5"
      }
    ]
  }
}
Credential to Bob

{
  "connection_id": "798a16bc-c792-4414-887b-d6d5accad3b1",
  "cred_def_id": "VA3GvaAZRZwrH4dDtVWd6E:3:CL:8:default",
  "credential_proposal": {
    "@type": "did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/issue-credential/1.0/credential-preview",
    "attributes": [
      {
        "name": "name",
        "value": "Bob Johnson"
      },
      {
        "name": "date",
        "value": "2019-05-31"
      },
      {
        "name": "degree",
        "value": "Physics"
      },
      {
        "name": "average",
        "value": "3"
      }
    ]
  }
}
Faber Agent use POST /issue-credential/send to issue these two credentials.

Zoom image will be displayed

Faber uses this API to issue credential to Alice and Bob.
Step 2.3: Alice and Bob see credentials in their wallets
For both Alice and Bob Agent, use GET /credentials to get the credential received and stored in the wallet.

Zoom image will be displayed

Credential in Alice’s wallet
Zoom image will be displayed

Credential in Bob’s wallet
Step 3: Proof Presentation
Again, before any communication happens, a secured connection is established between two agents. In this demo, Acme first establishes one connection to Alice, and one to Bob. After that Acme issues a proof request to them, showing what type of proof is needed to qualify the job application. Alice and Bob will build the proof based on the credential in their own wallets. Finally Alice and Bob send the proof to Acme, and we will observe the result.

Step 3.1: Acme establishes connections to Alice and Bob
Similar process as Step 2.1. Here Acme agent first uses POST /connections/create-invitation to create invitation, and Alice uses POST /connections/receive-invitation with the invitation object. Repeat the same for connection between Acme and Bob.

Without showing the detail as above, for record purpose I just need the Connection IDs viewed from Acme to Alice and to Bob. They are used later for proof requests.

Acme’s connection ID to Alice: ba1a486f-14ce-4835-a0b6-d42c6c7a2c3b
Acme’s connection ID to Bob: ab0577b7-d036–4b12–9303–26bd13f9d4f1
Step 3.2: Acme sends Proof Request to Alice and Bob
Proof request details the requirement Acme is asking for. For our demonstration, Acme is asking for

name, date and degree
average is over 4
all items following the Credential Definition specified by the ID
The JSON to be prepared to Alice and Bob. Note that the difference is on the Connection ID only. The Proof Request part is the same.

JSON for Proof Request to Alice

{
  "connection_id": "ba1a486f-14ce-4835-a0b6-d42c6c7a2c3b",
  "proof_request": {
    "name": "Proof of Education",
    "version": "1.0",
    "requested_attributes": {
      "0_name_uuid": {
        "name": "name",
        "restrictions": [
          {
            "cred_def_id": "VA3GvaAZRZwrH4dDtVWd6E:3:CL:8:default"
          }
        ]
      },
      "0_date_uuid": {
        "name": "date",
        "restrictions": [
          {
            "cred_def_id": "VA3GvaAZRZwrH4dDtVWd6E:3:CL:8:default"
          }
        ]
      },
      "0_degree_uuid": {
        "name": "degree",
        "restrictions": [
          {
            "cred_def_id": "VA3GvaAZRZwrH4dDtVWd6E:3:CL:8:default"
          }
        ]
      },
      "0_self_attested_thing_uuid": {
        "name": "self_attested_thing"
      }
    },
    "requested_predicates": {
      "0_average_GE_uuid": {
        "name": "average",
        "p_type": ">=",
        "p_value": 4,
        "restrictions": [
          {
            "cred_def_id": "VA3GvaAZRZwrH4dDtVWd6E:3:CL:8:default"
          }
        ]
      }
    }
  }
}
JSON for Proof Request to Bob

{
  "connection_id": "ab0577b7-d036-4b12-9303-26bd13f9d4f1",
  "proof_request": {
    "name": "Proof of Education",
    "version": "1.0",
    "requested_attributes": {
      "0_name_uuid": {
        "name": "name",
        "restrictions": [
          {
            "cred_def_id": "VA3GvaAZRZwrH4dDtVWd6E:3:CL:8:default"
          }
        ]
      },
      "0_date_uuid": {
        "name": "date",
        "restrictions": [
          {
            "cred_def_id": "VA3GvaAZRZwrH4dDtVWd6E:3:CL:8:default"
          }
        ]
      },
      "0_degree_uuid": {
        "name": "degree",
        "restrictions": [
          {
            "cred_def_id": "VA3GvaAZRZwrH4dDtVWd6E:3:CL:8:default"
          }
        ]
      },
      "0_self_attested_thing_uuid": {
        "name": "self_attested_thing"
      }
    },
    "requested_predicates": {
      "0_average_GE_uuid": {
        "name": "average",
        "p_type": ">=",
        "p_value": 4,
        "restrictions": [
          {
            "cred_def_id": "VA3GvaAZRZwrH4dDtVWd6E:3:CL:8:default"
          }
        ]
      }
    }
  }
}
Acme uses POST /present-proof/send-request with the JSON object.

Zoom image will be displayed

Acme uses this API to send proof request to Alice and Bob.
We see from Alice’s agent terminal and Bob’s the process

receiving the proof request
checking credentials
generating proof
sending proof to Acme
Zoom image will be displayed

Alice’s and Bob’s Agent terminals
From Acme, we can use GET /present-proof/records to see the proof sent by Alice and Bob. The presentation_exchange_id is the identifier of the presentation proof (local significant) and state will tell you the current status of this proof (presentation).

Zoom image will be displayed

Acme sees proof presentations from Alice and Bob.
Currently the state is presentation_received.

From the response we see the presentation exchange ID for the requests.

pres-ex-ID for Alice’s proof: c3462ed5–0fff-44a8–8eda-830bcd4486aa
pres-ex-ID for Bob’s proof: 31251183–7859–4ec0–9836–0c37dbfcbbba
Step 3.3: Acme verifies the presentations received from Alice and Bob
Finally Acme use POST /present-proof/{pres-ex-id}/verify-presentation to see both Alice’s and Bob’s presentations.

The response tells the different results.

Zoom image will be displayed

Alice passes the verification. Bob fails it.
For Alice, the response shows that the state is now changed to verified. And a new entry verified: true is seen. For Bob, since the predicate condition (average is over 4) is not met, the verification fails.

Overall Observation in this Demo
Here are some observations on Hyperledger Indy (ledger) and Hyperledger Aries (agent) from this demo.

In the ledger there is minimal information, good enough to establish the trust, including public DIDs, schemas and credential definitions. No personal data are found.
All personal data are communication over secured connections between agents.
There is no direct connection between credential issuers (Faber) and proof verifier (Acme). They trust each other, and other players in the same network.
To Alice and Bob, the credential issuance and proof presentation are two separate processes. They can receive the credentials and store them first. They can use them for proof later when needed.
When constructing a proof request, predicate attribute provides a way to prove something without disclosing the actual data. In the demo, the condition is “average is over 4”. It turns out Alice passes and Bob fails. In either case, the actual average (5 and 3 respectively) is not disclosed. This is handled by zero knowledge proof in the agent.