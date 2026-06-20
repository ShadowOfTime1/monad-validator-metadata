// Auto-generated from the compiled ValidatorMetadataRegistry artifact. Do not edit by hand.
export const registryAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "staking_",
        "type": "address",
        "internalType": "contract IStakingPrecompile"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "VERSION",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "authorityOf",
    "inputs": [
      {
        "name": "validatorId",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getMetadata",
    "inputs": [
      {
        "name": "validatorId",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IValidatorMetadata.Metadata",
        "components": [
          {
            "name": "name",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "website",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "logo",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "socials",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "additionalInfo",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getName",
    "inputs": [
      {
        "name": "validatorId",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasMetadata",
    "inputs": [
      {
        "name": "validatorId",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isWriter",
    "inputs": [
      {
        "name": "validatorId",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "writer",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setMetadata",
    "inputs": [
      {
        "name": "validatorId",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "data",
        "type": "tuple",
        "internalType": "struct IValidatorMetadata.Metadata",
        "components": [
          {
            "name": "name",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "website",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "logo",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "socials",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "additionalInfo",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setWriter",
    "inputs": [
      {
        "name": "validatorId",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "writer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "authorized",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "staking",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IStakingPrecompile"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "updateMetadataField",
    "inputs": [
      {
        "name": "validatorId",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "field",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "value",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "MetadataUpdated",
    "inputs": [
      {
        "name": "validatorId",
        "type": "uint64",
        "indexed": true,
        "internalType": "uint64"
      },
      {
        "name": "writer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "field",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "WriterAuthorized",
    "inputs": [
      {
        "name": "validatorId",
        "type": "uint64",
        "indexed": true,
        "internalType": "uint64"
      },
      {
        "name": "writer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "authorized",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "NotAuthorized",
    "inputs": [
      {
        "name": "validatorId",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "caller",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnknownField",
    "inputs": [
      {
        "name": "field",
        "type": "string",
        "internalType": "string"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnknownValidator",
    "inputs": [
      {
        "name": "validatorId",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  }
] as const;
