var data = {
    // constants mirrored from style.sass
    BASE_GRID_SIZE: 11,
    BOX_EDGE: 11 /* base-grid-size */ * 6,
    
    vscaleOptions: [
        32,
        64,
        128,
        192,
        256,
        384,
        512,
        768,
        1024,
        1536,
        2048,
        3072,
        4096
    ],
    serviceTypes: [
    {
      id: 'ssl',
      name: 'Dedicated SSL',
      type: 'extra',
      initialMemory: 192
    },
    {
      name: 'PHP',
      type: 'web',
      initialMemory: 64
    },
    {
      id: 'nodejs',
      name: 'Node.js',
      type: 'web',
      initialMemory: 64
    },
    {
      name: 'Python',
      type: 'web',
      initialMemory: 128
    },
    {
      name: 'Perl',
      type: 'web',
      initialMemory: 64
    },
    {
      name: 'Ruby',
      type: 'web',
      initialMemory: 512
    },
    {
      name: 'Java',
      type: 'web',
      initialMemory: 128
    },
    {
      name: 'Opa',
      type: 'web',
      initialMemory: 64
    },
    {
      name: 'Custom',
      type: 'web',
      initialMemory: 128
    },
    {
      name: 'Static',
      type: 'web',
      initialMemory: 32
    },
    {
      name: 'PHP',
      type: 'worker',
      initialMemory: 64
    },
    {
      id: 'nodejs',
      name: 'Node.js',
      type: 'worker',
      initialMemory: 64
    },
    {
      name: 'Python',
      type: 'worker',
      initialMemory: 64
    },
    {
      name: 'Perl',
      type: 'worker',
      initialMemory: 64
    },
    {
      name: 'Ruby',
      type: 'worker',
      initialMemory: 64
    },
    {
      name: 'Java',
      type: 'worker',
      initialMemory: 128
    },
    {
      name: 'Custom',
      type: 'worker',
      initialMemory: 128
    },
    {
      name: 'MySQL',
      type: 'data',
      initialMemory: 64
    },
    {
      name: 'MongoDB',
      type: 'data',
      initialMemory: 512
    },
    {
      name: 'Redis',
      type: 'data',
      initialMemory: 64
    },
    {
      name: 'PostgreSQL',
      type: 'data',
      initialMemory: 32
    },
    {
      name: 'Solr',
      type: 'data',
      initialMemory: 128
    },
    {
      name: 'RabbitMQ',
      type: 'data',
      initialMemory: 128
    },
    {
      name: 'SMTP',
      type: 'extra',
      initialMemory: 32
    }
  ],
  stackTypes: [
    {
      name: 'Django',
      serviceTypeIDs: [
        'python',
        'mysql'
      ],
    },
    {
      name: 'Rails',
      serviceTypeIDs: [
        'ruby',
        'mysql'
      ]
    },
    {
      name: 'Play',
      serviceTypeIDs: [
        'java',
        'mysql'
      ]
    },
    {
      name: 'Spring',
      serviceTypeIDs: [
        'java',
        'mysql'
      ]
    },
    {
      name: 'Drupal',
      serviceTypeIDs: [
        'php',
        'mysql'
      ]
    },
    {
      name: 'Symphony',
      serviceTypeIDs: [
        'php',
        'mysql'
      ]
    }
  ]
}


