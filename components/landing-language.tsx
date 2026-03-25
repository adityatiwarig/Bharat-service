'use client'

import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'

export type LandingLanguage = 'en' | 'hi'

const STORAGE_KEY = 'landing-language'

export const landingTranslations = {
  en: {
    language: {
      en: 'EN',
      hi: '\u0939\u093f\u0902\u0926\u0940',
    },
    header: {
      skipToMainContent: 'Skip to main content',
      officialPortal: 'Official Municipal Citizen Grievance Portal',
      govDelhi: 'Government of NCT of Delhi',
      mcd: 'Municipal Corporation of Delhi',
      govcrmPortal: 'GovCRM Public Grievance Redressal Portal',
      complaintCategories: 'Complaint Categories',
      processFlow: 'Process Flow',
      trackComplaint: 'Track Complaint',
      officerLogin: 'Officer Login',
      lodgeComplaint: 'Lodge Complaint',
      citizen: 'Citizen',
      officer: 'Officer',
      helpdesk: 'Citizen Helpdesk',
    },
    hero: {
      mcd: 'Municipal Corporation of Delhi',
      officialPortal: 'Official Municipal Citizen Grievance Portal',
      title: 'Public Grievance Portal',
      subtitle: 'File and track complaints easily with transparency',
      lodgeComplaint: 'Lodge Complaint',
      trackComplaint: 'Track Complaint',
      stats: {
        complaintsResolved: 'Complaints Resolved',
        averageSla: 'Average SLA',
        activeCitizens: 'Active Citizens',
        availability: 'Availability',
      },
    },
    page: {
      citizenServicesTag: 'Citizen Services',
      citizenServicesTitleLine1: 'Public Grievance',
      citizenServicesTitleLine2: 'Portal',
      citizenServicesSubtitle: 'File and track civic complaints easily.',
      citizenAction: 'Citizen Action',
      open: 'Open',
      portalActions: {
        citizenLogin: 'Citizen Login / Register',
        citizenLoginDescription: 'Access your dashboard and manage requests.',
        lodgeComplaint: 'Lodge Complaint',
        lodgeComplaintDescription: 'Submit your issue quickly and securely.',
        trackComplaint: 'Track Complaint',
        trackComplaintDescription: 'Check real-time complaint status.',
      },
      officialInformationTag: 'Official Information',
      officialInformationTitle: 'Structured public-facing information for grievance filing',
      infoRows: {
        scopeTitle: 'Scope of the portal',
        scopeDescription:
          'This portal supports complaints related to roads, sanitation, water, drainage, encroachment, illegal construction, and other municipal public service matters.',
        legalTitle: 'Legal clarity',
        legalDescription: 'This portal does not handle RTI applications, court matters, or wider policy issues.',
        proofTitle: 'Complaint proof and tracking',
        proofDescription: 'Each submission receives a complaint ID and follows a visible stage-wise status flow.',
      },
      trustTag: 'Trust and Public Assurance',
      trustSignals: [
        'Assigned officer visibility and complaint ownership throughout processing.',
        'Standard municipal SLA benchmark with escalation workflow on delay.',
        'Complaint ID based tracking from submission to final closure.',
        'Government-style public grievance interface with ward-based routing.',
      ],
      servicesTag: 'Yojana and Citizen Service Categories',
      servicesTitle: 'Explore public service areas before you register a complaint',
      servicesSubtitle:
        'This section helps citizens quickly understand the municipal services and assistance areas available on the portal.',
      services: [
        {
          title: 'Roads and Public Safety',
          description:
            'Report potholes, damaged roads, open drains, unsafe footpaths, and related public safety issues.',
        },
        {
          title: 'Water and Sanitation',
          description: 'Raise complaints for leakage, sewer blockage, drainage overflow, and sanitation concerns.',
        },
        {
          title: 'Garbage Collection',
          description: 'Report unattended garbage, delayed pickup, and unclean public spaces in your area.',
        },
        {
          title: 'Encroachment',
          description: 'Report road, market, or footpath encroachment affecting public movement and access.',
        },
        {
          title: 'Illegal Construction',
          description: 'Submit complaints related to unauthorized building activity or unsafe structural development.',
        },
        {
          title: 'Noise Pollution',
          description: 'Raise complaints for loudspeaker, generator, construction, or recurring neighborhood noise.',
        },
      ],
      howItWorksTag: 'How It Works',
      howItWorksTitle: 'Complaint resolution in five clear steps',
      howItWorksSubtitle:
        'From complaint filing to final closure, each stage is visible so citizens can track progress with clarity.',
      processStats: {
        averageAction: 'Average Action',
        averageActionValue: '2-5 Days',
        tracking: 'Tracking',
        trackingValue: 'Complaint ID',
        escalation: 'Escalation',
        escalationValue: 'SLA Based',
      },
      processSteps: [
        {
          timeline: 'Stage 1',
          title: 'Register or sign in',
          description: 'Sign in to begin your complaint.',
        },
        {
          timeline: 'Stage 2',
          title: 'Submit complaint details',
          description: 'Add ward, issue, and location details.',
        },
        {
          timeline: 'Stage 3',
          title: 'Officer assignment',
          description: 'The case is routed to the right officer.',
        },
        {
          timeline: 'Stage 4',
          title: 'Action and updates',
          description: 'Teams post progress and field updates.',
        },
        {
          timeline: 'Stage 5',
          title: 'Resolution or escalation',
          description: 'Close the case or escalate on delay.',
        },
      ],
      wardDistributionTag: 'Ward-wise Complaint Distribution',
      wardDistributionTitle: 'Ward-wise Complaint Distribution',
      wardDistributionSubtitle: 'Live overview of complaint volume across wards',
    },
    banner: {
      slides: [
        'Citizens using a digital governance service interface',
        'Municipal public service staff supporting grievance resolution',
        'Public infrastructure and governance support services',
      ],
      previousBanner: 'Show previous banner',
      nextBanner: 'Show next banner',
      goToBanner: 'Go to banner',
      tag: 'Digital Public Services',
      title: 'Empowering Citizens Through Digital Governance',
      subtitle: 'Register complaints, track progress, and ensure accountability.',
      lodgeComplaint: 'Lodge Complaint',
      trackStatus: 'Track Status',
    },
    map: {
      fallbackTitle: 'Ward Complaint Map',
      fallbackDescription: 'Loading ward complaint distribution.',
      title: 'Ward Complaint Map',
      description: 'Zoomed out view shows vapor-style density. Zoom in to split wards apart and reveal counts.',
      ariaLabel: 'Ward-wise complaint distribution map',
      complaints: 'Complaints',
      zone: 'Zone',
      wards: 'wards',
      totalComplaints: 'Total complaints',
      wardCluster: 'Ward cluster',
      delhi: 'Delhi',
    },
    footer: {
      topTitle: 'Government of NCT of Delhi | Municipal Corporation of Delhi',
      topSubtitle: 'Official Public Grievance Redressal Portal',
      about: 'About',
      aboutTitle: 'GovCRM Portal',
      aboutDescription:
        'Official grievance redressal system for citizens. Submit complaints, track status, and ensure accountability across departments.',
      citizenServices: 'Citizen Services',
      policies: 'Policies',
      contactAuthority: 'Contact & Authority',
      citizenLinks: {
        lodgeComplaint: 'Lodge Complaint',
        trackComplaint: 'Track Complaint',
        faqs: 'FAQs',
        howItWorks: 'How it Works',
      },
      policyLinks: {
        privacyPolicy: 'Privacy Policy',
        terms: 'Terms & Conditions',
        disclaimer: 'Disclaimer',
      },
      importantLinks: 'Important Links',
      disclaimer: 'Disclaimer',
      disclaimerText:
        'This portal is intended for civic grievance redressal only. RTI matters, court cases, and policy issues are not handled here.',
      ownedBy: 'Owned by:',
      developedBy: 'Developed by:',
      rightsReserved: 'All Rights Reserved',
      lastUpdated: 'Last Updated',
    },
  },
  hi: {
    language: {
      en: 'EN',
      hi: '\u0939\u093f\u0902\u0926\u0940',
    },
    header: {
      skipToMainContent: '\u092e\u0941\u0916\u094d\u092f \u0938\u093e\u092e\u0917\u094d\u0930\u0940 \u092a\u0930 \u091c\u093e\u090f\u0901',
      officialPortal: '\u0906\u0927\u093f\u0915\u093e\u0930\u093f\u0915 \u0928\u0917\u0930 \u0928\u093f\u0917\u092e \u0928\u093e\u0917\u0930\u093f\u0915 \u0936\u093f\u0915\u093e\u092f\u0924 \u092a\u094b\u0930\u094d\u091f\u0932',
      govDelhi: '\u0926\u093f\u0932\u094d\u0932\u0940 \u0930\u093e\u0937\u094d\u091f\u094d\u0930\u0940\u092f \u0930\u093e\u091c\u0927\u093e\u0928\u0940 \u0915\u094d\u0937\u0947\u0924\u094d\u0930 \u0938\u0930\u0915\u093e\u0930',
      mcd: '\u0926\u093f\u0932\u094d\u0932\u0940 \u0928\u0917\u0930 \u0928\u093f\u0917\u092e',
      govcrmPortal: 'GovCRM \u0932\u094b\u0915 \u0936\u093f\u0915\u093e\u092f\u0924 \u0928\u093f\u0935\u093e\u0930\u0923 \u092a\u094b\u0930\u094d\u091f\u0932',
      complaintCategories: '\u0936\u093f\u0915\u093e\u092f\u0924 \u0936\u094d\u0930\u0947\u0923\u093f\u092f\u093e\u0901',
      processFlow: '\u092a\u094d\u0930\u0915\u094d\u0930\u093f\u092f\u093e \u092a\u094d\u0930\u0935\u093e\u0939',
      trackComplaint: '\u0936\u093f\u0915\u093e\u092f\u0924 \u091f\u094d\u0930\u0948\u0915 \u0915\u0930\u0947\u0902',
      officerLogin: '\u0905\u0927\u093f\u0915\u093e\u0930\u0940 \u0932\u0949\u0917\u093f\u0928',
      lodgeComplaint: '\u0936\u093f\u0915\u093e\u092f\u0924 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902',
      citizen: '\u0928\u093e\u0917\u0930\u093f\u0915',
      officer: '\u0905\u0927\u093f\u0915\u093e\u0930\u0940',
      helpdesk: '\u0928\u093e\u0917\u0930\u093f\u0915 \u0939\u0947\u0932\u094d\u092a\u0921\u0947\u0938\u094d\u0915',
    },
    hero: {
      mcd: '\u0926\u093f\u0932\u094d\u0932\u0940 \u0928\u0917\u0930 \u0928\u093f\u0917\u092e',
      officialPortal: '\u0906\u0927\u093f\u0915\u093e\u0930\u093f\u0915 \u0928\u0917\u0930 \u0928\u093f\u0917\u092e \u0928\u093e\u0917\u0930\u093f\u0915 \u0936\u093f\u0915\u093e\u092f\u0924 \u092a\u094b\u0930\u094d\u091f\u0932',
      title: '\u0932\u094b\u0915 \u0936\u093f\u0915\u093e\u092f\u0924 \u092a\u094b\u0930\u094d\u091f\u0932',
      subtitle:
        '\u092a\u093e\u0930\u0926\u0930\u094d\u0936\u093f\u0924\u093e \u0915\u0947 \u0938\u093e\u0925 \u0936\u093f\u0915\u093e\u092f\u0924 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902 \u0914\u0930 \u0909\u0938\u0915\u0940 \u0938\u094d\u0925\u093f\u0924\u093f \u0938\u0930\u0932\u0924\u093e \u0938\u0947 \u0926\u0947\u0916\u0947\u0902',
      lodgeComplaint: '\u0936\u093f\u0915\u093e\u092f\u0924 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902',
      trackComplaint: '\u0936\u093f\u0915\u093e\u092f\u0924 \u091f\u094d\u0930\u0948\u0915 \u0915\u0930\u0947\u0902',
      stats: {
        complaintsResolved: '\u0928\u093f\u0938\u094d\u0924\u093e\u0930\u093f\u0924 \u0936\u093f\u0915\u093e\u092f\u0924\u0947\u0902',
        averageSla: '\u0914\u0938\u0924 \u0938\u0947\u0935\u093e \u0938\u092e\u092f',
        activeCitizens: '\u0938\u0915\u094d\u0930\u093f\u092f \u0928\u093e\u0917\u0930\u093f\u0915',
        availability: '\u0909\u092a\u0932\u092c\u094d\u0927\u0924\u093e',
      },
    },
    page: {
      citizenServicesTag: '\u0928\u093e\u0917\u0930\u093f\u0915 \u0938\u0947\u0935\u093e\u090f\u0901',
      citizenServicesTitleLine1: '\u0932\u094b\u0915 \u0936\u093f\u0915\u093e\u092f\u0924',
      citizenServicesTitleLine2: '\u092a\u094b\u0930\u094d\u091f\u0932',
      citizenServicesSubtitle: '\u0928\u093e\u0917\u0930\u093f\u0915 \u0936\u093f\u0915\u093e\u092f\u0924\u0947\u0902 \u0938\u0930\u0932\u0924\u093e \u0938\u0947 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902 \u0914\u0930 \u0909\u0928\u0915\u0940 \u0938\u094d\u0925\u093f\u0924\u093f \u0926\u0947\u0916\u0947\u0902\u0964',
      citizenAction: '\u0928\u093e\u0917\u0930\u093f\u0915 \u0915\u093e\u0930\u094d\u0930\u0935\u093e\u0908',
      open: '\u0916\u094b\u0932\u0947\u0902',
      portalActions: {
        citizenLogin: '\u0928\u093e\u0917\u0930\u093f\u0915 \u0932\u0949\u0917\u093f\u0928 / \u092a\u0902\u091c\u0940\u0915\u0930\u0923',
        citizenLoginDescription: '\u0905\u092a\u0928\u0947 \u0921\u0948\u0936\u092c\u094b\u0930\u094d\u0921 \u0924\u0915 \u092a\u0939\u0941\u0901\u091a\u0947\u0902 \u0914\u0930 \u0905\u0928\u0941\u0930\u094b\u0927 \u092a\u094d\u0930\u092c\u0902\u0927\u093f\u0924 \u0915\u0930\u0947\u0902\u0964',
        lodgeComplaint: '\u0936\u093f\u0915\u093e\u092f\u0924 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902',
        lodgeComplaintDescription: '\u0905\u092a\u0928\u0940 \u0938\u092e\u0938\u094d\u092f\u093e \u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u0914\u0930 \u0938\u0930\u0932 \u0924\u0930\u0940\u0915\u0947 \u0938\u0947 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902\u0964',
        trackComplaint: '\u0936\u093f\u0915\u093e\u092f\u0924 \u091f\u094d\u0930\u0948\u0915 \u0915\u0930\u0947\u0902',
        trackComplaintDescription: '\u0936\u093f\u0915\u093e\u092f\u0924 \u0915\u0940 \u0935\u093e\u0938\u094d\u0924\u0935\u093f\u0915 \u0938\u092e\u092f \u0938\u094d\u0925\u093f\u0924\u093f \u0926\u0947\u0916\u0947\u0902\u0964',
      },
      officialInformationTag: '\u0906\u0927\u093f\u0915\u093e\u0930\u093f\u0915 \u091c\u093e\u0928\u0915\u093e\u0930\u0940',
      officialInformationTitle: '\u0936\u093f\u0915\u093e\u092f\u0924 \u092a\u0902\u091c\u0940\u0915\u0930\u0923 \u0939\u0947\u0924\u0941 \u0938\u0902\u0930\u091a\u093f\u0924 \u0938\u093e\u0930\u094d\u0935\u091c\u0928\u093f\u0915 \u091c\u093e\u0928\u0915\u093e\u0930\u0940',
      infoRows: {
        scopeTitle: '\u092a\u094b\u0930\u094d\u091f\u0932 \u0915\u093e \u0926\u093e\u092f\u0930\u093e',
        scopeDescription:
          '\u092f\u0939 \u092a\u094b\u0930\u094d\u091f\u0932 \u0938\u0921\u093c\u0915\u094b\u0902, \u0938\u094d\u0935\u091a\u094d\u091b\u0924\u093e, \u091c\u0932, \u0928\u093f\u0915\u093e\u0938\u0940, \u0905\u0924\u093f\u0915\u094d\u0930\u092e\u0923, \u0905\u0935\u0948\u0927 \u0928\u093f\u0930\u094d\u092e\u093e\u0923 \u0924\u0925\u093e \u0905\u0928\u094d\u092f \u0928\u0917\u0930 \u0928\u093f\u0917\u092e \u091c\u0928\u0938\u0947\u0935\u093e \u0935\u093f\u0937\u092f\u094b\u0902 \u0938\u0947 \u0938\u0902\u092c\u0902\u0927\u093f\u0924 \u0936\u093f\u0915\u093e\u092f\u0924\u094b\u0902 \u0915\u0947 \u0932\u093f\u090f \u0909\u092a\u0932\u092c\u094d\u0927 \u0939\u0948\u0964',
        legalTitle: '\u0935\u093f\u0927\u093f\u0915 \u0938\u094d\u092a\u0937\u094d\u091f\u0924\u093e',
        legalDescription:
          '\u092f\u0939 \u092a\u094b\u0930\u094d\u091f\u0932 \u0906\u0930\u091f\u0940\u0906\u0908 \u0906\u0935\u0947\u0926\u0928, \u0928\u094d\u092f\u093e\u092f\u093e\u0932\u092f\u0940\u0928 \u092e\u093e\u092e\u0932\u0947 \u092f\u093e \u0935\u094d\u092f\u093e\u092a\u0915 \u0928\u0940\u0924\u093f\u0917\u0924 \u0935\u093f\u0937\u092f\u094b\u0902 \u0915\u093e \u0928\u093f\u0938\u094d\u0924\u093e\u0930\u0923 \u0928\u0939\u0940\u0902 \u0915\u0930\u0924\u093e \u0939\u0948\u0964',
        proofTitle: '\u0936\u093f\u0915\u093e\u092f\u0924 \u092a\u094d\u0930\u092e\u093e\u0923 \u0914\u0930 \u091f\u094d\u0930\u0948\u0915\u093f\u0902\u0917',
        proofDescription:
          '\u092a\u094d\u0930\u0924\u094d\u092f\u0947\u0915 \u0936\u093f\u0915\u093e\u092f\u0924 \u0915\u094b \u090f\u0915 \u0936\u093f\u0915\u093e\u092f\u0924 \u0906\u0908\u0921\u0940 \u092a\u094d\u0930\u0926\u093e\u0928 \u0915\u0940 \u091c\u093e\u0924\u0940 \u0939\u0948 \u0914\u0930 \u0909\u0938\u0915\u093e \u091a\u0930\u0923\u0935\u093e\u0930 \u0938\u094d\u0925\u093f\u0924\u093f \u092a\u094d\u0930\u0935\u093e\u0939 \u0909\u092a\u0932\u092c\u094d\u0927 \u0930\u0939\u0924\u093e \u0939\u0948\u0964',
      },
      trustTag: '\u0935\u093f\u0936\u094d\u0935\u093e\u0938 \u0914\u0930 \u091c\u0928 \u0906\u0936\u094d\u0935\u093e\u0938\u0928',
      trustSignals: [
        '\u092a\u094d\u0930\u0938\u0902\u0938\u094d\u0915\u0930\u0923 \u0915\u0947 \u0926\u094c\u0930\u093e\u0928 \u0928\u093f\u092f\u0941\u0915\u094d\u0924 \u0905\u0927\u093f\u0915\u093e\u0930\u0940 \u0914\u0930 \u0936\u093f\u0915\u093e\u092f\u0924 \u0938\u094d\u0935\u093e\u092e\u093f\u0924\u094d\u0935 \u0915\u0940 \u0938\u094d\u092a\u0937\u094d\u091f \u0926\u0943\u0936\u094d\u092f\u0924\u093e \u0909\u092a\u0932\u092c\u094d\u0927 \u0930\u0939\u0924\u0940 \u0939\u0948\u0964',
        '\u0935\u093f\u0932\u0902\u092c \u0939\u094b\u0928\u0947 \u092a\u0930 \u090f\u0938\u094d\u0915\u0947\u0932\u0947\u0936\u0928 \u0915\u093e\u0930\u094d\u092f\u092a\u094d\u0930\u0935\u093e\u0939 \u0938\u0939\u093f\u0924 \u092e\u093e\u0928\u0915 \u0928\u0917\u0930 \u0928\u093f\u0917\u092e SLA \u092e\u093e\u0928\u0915 \u0932\u093e\u0917\u0942 \u0930\u0939\u0924\u093e \u0939\u0948\u0964',
        '\u092a\u094d\u0930\u0924\u094d\u092f\u0947\u0915 \u0936\u093f\u0915\u093e\u092f\u0924 \u0915\u094b \u092a\u0902\u091c\u0940\u0915\u0930\u0923 \u0938\u0947 \u0905\u0902\u0924\u093f\u092e \u0928\u093f\u0938\u094d\u0924\u093e\u0930\u0923 \u0924\u0915 \u0936\u093f\u0915\u093e\u092f\u0924 \u0906\u0908\u0921\u0940 \u0906\u0927\u093e\u0930\u093f\u0924 \u091f\u094d\u0930\u0948\u0915\u093f\u0902\u0917 \u092e\u093f\u0932\u0924\u0940 \u0939\u0948\u0964',
        '\u092f\u0939 \u092a\u094b\u0930\u094d\u091f\u0932 \u0935\u093e\u0930\u094d\u0921-\u0906\u0927\u093e\u0930\u093f\u0924 \u0930\u0942\u091f\u093f\u0902\u0917 \u0915\u0947 \u0938\u093e\u0925 \u0938\u0930\u0915\u093e\u0930\u0940 \u0936\u0948\u0932\u0940 \u0915\u0940 \u0932\u094b\u0915 \u0936\u093f\u0915\u093e\u092f\u0924 \u092a\u094d\u0930\u0923\u093e\u0932\u0940 \u092a\u094d\u0930\u0926\u093e\u0928 \u0915\u0930\u0924\u093e \u0939\u0948\u0964',
      ],
      servicesTag: '\u092f\u094b\u091c\u0928\u093e \u0914\u0930 \u0928\u093e\u0917\u0930\u093f\u0915 \u0938\u0947\u0935\u093e \u0936\u094d\u0930\u0947\u0923\u093f\u092f\u093e\u0901',
      servicesTitle: '\u0936\u093f\u0915\u093e\u092f\u0924 \u0926\u0930\u094d\u091c \u0915\u0930\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u0909\u092a\u0932\u092c\u094d\u0927 \u091c\u0928\u0938\u0947\u0935\u093e \u0915\u094d\u0937\u0947\u0924\u094d\u0930\u094b\u0902 \u0915\u094b \u0938\u092e\u091d\u0947\u0902',
      servicesSubtitle:
        '\u092f\u0939 \u0905\u0928\u0941\u092d\u093e\u0917 \u0928\u093e\u0917\u0930\u093f\u0915\u094b\u0902 \u0915\u094b \u092a\u094b\u0930\u094d\u091f\u0932 \u092a\u0930 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0917\u0930 \u0938\u0947\u0935\u093e\u0913\u0902 \u0914\u0930 \u0938\u0939\u093e\u092f\u0924\u093e \u0915\u094d\u0937\u0947\u0924\u094d\u0930\u094b\u0902 \u0915\u094b \u091c\u0932\u094d\u0926\u0940 \u0938\u092e\u091d\u0928\u0947 \u092e\u0947\u0902 \u092e\u0926\u0926 \u0915\u0930\u0924\u093e \u0939\u0948\u0964',
      services: [
        {
          title: '\u0938\u0921\u093c\u0915\u0947\u0902 \u0914\u0930 \u0938\u093e\u0930\u094d\u0935\u091c\u0928\u093f\u0915 \u0938\u0941\u0930\u0915\u094d\u0937\u093e',
          description:
            '\u0917\u0921\u094d\u0922\u0947, \u0915\u094d\u0937\u0924\u093f\u0917\u094d\u0930\u0938\u094d\u0924 \u0938\u0921\u093c\u0915\u0947\u0902, \u0916\u0941\u0932\u0947 \u0928\u093e\u0932\u0947, \u0905\u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u092b\u0941\u091f\u092a\u093e\u0925 \u0914\u0930 \u0938\u0902\u092c\u0902\u0927\u093f\u0924 \u0938\u093e\u0930\u094d\u0935\u091c\u0928\u093f\u0915 \u0938\u0941\u0930\u0915\u094d\u0937\u093e \u0938\u092e\u0938\u094d\u092f\u093e\u0913\u0902 \u0915\u0940 \u0936\u093f\u0915\u093e\u092f\u0924 \u0915\u0930\u0947\u0902\u0964',
        },
        {
          title: '\u091c\u0932 \u0914\u0930 \u0938\u094d\u0935\u091a\u094d\u091b\u0924\u093e',
          description:
            '\u0932\u0940\u0915\u0947\u091c, \u0938\u0940\u0935\u0930 \u091c\u093e\u092e, \u091c\u0932 \u0928\u093f\u0915\u093e\u0938\u0940 \u0913\u0935\u0930\u092b\u094d\u0932\u094b \u0914\u0930 \u0938\u094d\u0935\u091a\u094d\u091b\u0924\u093e \u0938\u0902\u092c\u0902\u0927\u0940 \u0936\u093f\u0915\u093e\u092f\u0924\u0947\u0902 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902\u0964',
        },
        {
          title: '\u0915\u091a\u0930\u093e \u0938\u0902\u0917\u094d\u0930\u0939\u0923',
          description:
            '\u0905\u0935\u0938\u094d\u0925\u093f\u0924 \u0915\u091a\u0930\u093e, \u0935\u093f\u0932\u0902\u092c\u093f\u0924 \u0938\u0902\u0917\u094d\u0930\u0939\u0923 \u0914\u0930 \u0938\u093e\u0930\u094d\u0935\u091c\u0928\u093f\u0915 \u0938\u094d\u0925\u093e\u0928\u094b\u0902 \u0915\u0940 \u0938\u092b\u093e\u0908 \u0938\u0902\u092c\u0902\u0927\u0940 \u0936\u093f\u0915\u093e\u092f\u0924 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902\u0964',
        },
        {
          title: '\u0905\u0924\u093f\u0915\u094d\u0930\u092e\u0923',
          description:
            '\u0938\u0921\u093c\u0915, \u092c\u093e\u091c\u093e\u0930 \u092f\u093e \u092b\u0941\u091f\u092a\u093e\u0925 \u092a\u0930 \u090f\u0948\u0938\u0947 \u0905\u0924\u093f\u0915\u094d\u0930\u092e\u0923 \u0915\u0940 \u0936\u093f\u0915\u093e\u092f\u0924 \u0915\u0930\u0947\u0902 \u091c\u094b \u0938\u093e\u0930\u094d\u0935\u091c\u0928\u093f\u0915 \u0906\u0935\u093e\u0917\u092e\u0928 \u0915\u094b \u092a\u094d\u0930\u092d\u093e\u0935\u093f\u0924 \u0915\u0930\u0924\u0947 \u0939\u094b\u0902\u0964',
        },
        {
          title: '\u0905\u0935\u0948\u0927 \u0928\u093f\u0930\u094d\u092e\u093e\u0923',
          description:
            '\u0905\u0928\u0927\u093f\u0915\u0943\u0924 \u0928\u093f\u0930\u094d\u092e\u093e\u0923 \u0917\u0924\u093f\u0935\u093f\u0927\u093f \u092f\u093e \u0905\u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u0938\u0902\u0930\u091a\u0928\u093e\u0924\u094d\u092e\u0915 \u0935\u093f\u0915\u093e\u0938 \u0938\u0947 \u0938\u0902\u092c\u0902\u0927\u093f\u0924 \u0936\u093f\u0915\u093e\u092f\u0924 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902\u0964',
        },
        {
          title: '\u0927\u094d\u0935\u0928\u093f \u092a\u094d\u0930\u0926\u0942\u0937\u0923',
          description:
            '\u0932\u093e\u0909\u0921\u0938\u094d\u092a\u0940\u0915\u0930, \u091c\u0928\u0930\u0947\u091f\u0930, \u0928\u093f\u0930\u094d\u092e\u093e\u0923 \u0915\u093e\u0930\u094d\u092f \u092f\u093e \u0932\u0917\u093e\u0924\u093e\u0930 \u092a\u0921\u093c\u094b\u0938\u0940 \u0936\u094b\u0930 \u0938\u0947 \u0938\u0902\u092c\u0902\u0927\u093f\u0924 \u0936\u093f\u0915\u093e\u092f\u0924 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902\u0964',
        },
      ],
      howItWorksTag: '\u092f\u0939 \u0915\u0948\u0938\u0947 \u0915\u093e\u0930\u094d\u092f \u0915\u0930\u0924\u093e \u0939\u0948',
      howItWorksTitle: '\u0936\u093f\u0915\u093e\u092f\u0924 \u0928\u093f\u0938\u094d\u0924\u093e\u0930\u0923 \u0915\u0940 \u092a\u093e\u0901\u091a \u0938\u094d\u092a\u0937\u094d\u091f \u0905\u0935\u0938\u094d\u0925\u093e\u090f\u0901',
      howItWorksSubtitle:
        '\u0936\u093f\u0915\u093e\u092f\u0924 \u0926\u0930\u094d\u091c \u0939\u094b\u0928\u0947 \u0938\u0947 \u0905\u0902\u0924\u093f\u092e \u0928\u093f\u0938\u094d\u0924\u093e\u0930\u0923 \u0924\u0915 \u092a\u094d\u0930\u0924\u094d\u092f\u0947\u0915 \u091a\u0930\u0923 \u0926\u0943\u0936\u094d\u092f \u0930\u0939\u0924\u093e \u0939\u0948, \u091c\u093f\u0938\u0938\u0947 \u0928\u093e\u0917\u0930\u093f\u0915 \u092a\u094d\u0930\u0917\u0924\u093f \u0938\u094d\u092a\u0937\u094d\u091f \u0930\u0942\u092a \u0938\u0947 \u0926\u0947\u0916 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964',
      processStats: {
        averageAction: '\u0914\u0938\u0924 \u0915\u093e\u0930\u094d\u0930\u0935\u093e\u0908',
        averageActionValue: '2-5 \u0926\u093f\u0928',
        tracking: '\u091f\u094d\u0930\u0948\u0915\u093f\u0902\u0917',
        trackingValue: '\u0936\u093f\u0915\u093e\u092f\u0924 \u0906\u0908\u0921\u0940',
        escalation: '\u090f\u0938\u094d\u0915\u0947\u0932\u0947\u0936\u0928',
        escalationValue: 'SLA \u0906\u0927\u093e\u0930\u093f\u0924',
      },
      processSteps: [
        {
          timeline: '\u091a\u0930\u0923 1',
          title: '\u092a\u0902\u091c\u0940\u0915\u0930\u0923 \u0915\u0930\u0947\u0902 \u092f\u093e \u0938\u093e\u0907\u0928 \u0907\u0928 \u0915\u0930\u0947\u0902',
          description: '\u0905\u092a\u0928\u0940 \u0936\u093f\u0915\u093e\u092f\u0924 \u092a\u094d\u0930\u093e\u0930\u0902\u092d \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0938\u093e\u0907\u0928 \u0907\u0928 \u0915\u0930\u0947\u0902\u0964',
        },
        {
          timeline: '\u091a\u0930\u0923 2',
          title: '\u0936\u093f\u0915\u093e\u092f\u0924 \u0935\u093f\u0935\u0930\u0923 \u091c\u092e\u093e \u0915\u0930\u0947\u0902',
          description: '\u0935\u093e\u0930\u094d\u0921, \u0935\u093f\u0937\u092f \u0914\u0930 \u0938\u094d\u0925\u093e\u0928 \u0915\u093e \u0935\u093f\u0935\u0930\u0923 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902\u0964',
        },
        {
          timeline: '\u091a\u0930\u0923 3',
          title: '\u0905\u0927\u093f\u0915\u093e\u0930\u0940 \u0906\u0935\u0902\u091f\u0928',
          description: '\u092e\u093e\u092e\u0932\u0947 \u0915\u094b \u0938\u0902\u092c\u0902\u0927\u093f\u0924 \u0905\u0927\u093f\u0915\u093e\u0930\u0940 \u0924\u0915 \u092d\u0947\u091c\u093e \u091c\u093e\u0924\u093e \u0939\u0948\u0964',
        },
        {
          timeline: '\u091a\u0930\u0923 4',
          title: '\u0915\u093e\u0930\u094d\u0930\u0935\u093e\u0908 \u0914\u0930 \u0905\u0926\u094d\u092f\u0924\u0928',
          description: '\u091f\u0940\u092e\u0947\u0902 \u092a\u094d\u0930\u0917\u0924\u093f \u0914\u0930 \u092b\u0940\u0932\u094d\u0921 \u0905\u092a\u0921\u0947\u091f \u0926\u0930\u094d\u091c \u0915\u0930\u0924\u0940 \u0939\u0948\u0902\u0964',
        },
        {
          timeline: '\u091a\u0930\u0923 5',
          title: '\u0928\u093f\u0938\u094d\u0924\u093e\u0930\u0923 \u092f\u093e \u090f\u0938\u094d\u0915\u0947\u0932\u0947\u0936\u0928',
          description: '\u0935\u093f\u0932\u0902\u092c \u0939\u094b\u0928\u0947 \u092a\u0930 \u092e\u093e\u092e\u0932\u093e \u092c\u0902\u0926 \u0915\u093f\u092f\u093e \u091c\u093e\u0924\u093e \u0939\u0948 \u092f\u093e \u0906\u0917\u0947 \u092d\u0947\u091c\u093e \u091c\u093e\u0924\u093e \u0939\u0948\u0964',
        },
      ],
      wardDistributionTag: '\u0935\u093e\u0930\u094d\u0921\u0935\u093e\u0930 \u0936\u093f\u0915\u093e\u092f\u0924 \u0935\u093f\u0924\u0930\u0923',
      wardDistributionTitle: '\u0935\u093e\u0930\u094d\u0921\u0935\u093e\u0930 \u0936\u093f\u0915\u093e\u092f\u0924 \u0935\u093f\u0924\u0930\u0923',
      wardDistributionSubtitle: '\u0935\u093e\u0930\u094d\u0921\u094b\u0902 \u092e\u0947\u0902 \u0936\u093f\u0915\u093e\u092f\u0924 \u092e\u093e\u0924\u094d\u0930\u093e \u0915\u093e \u0932\u093e\u0907\u0935 \u0905\u0935\u0932\u094b\u0915\u0928',
    },
    banner: {
      slides: [
        '\u0921\u093f\u091c\u093f\u091f\u0932 \u0936\u093e\u0938\u0928 \u0938\u0947\u0935\u093e \u0907\u0902\u091f\u0930\u092b\u0947\u0938 \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u0930\u0924\u0947 \u0928\u093e\u0917\u0930\u093f\u0915',
        '\u0936\u093f\u0915\u093e\u092f\u0924 \u0928\u093f\u0938\u094d\u0924\u093e\u0930\u0923 \u092e\u0947\u0902 \u0938\u0939\u092f\u094b\u0917 \u0915\u0930\u0924\u0947 \u0928\u0917\u0930 \u0938\u0947\u0935\u093e \u0915\u0930\u094d\u092e\u091a\u093e\u0930\u0940',
        '\u0938\u093e\u0930\u094d\u0935\u091c\u0928\u093f\u0915 \u0905\u0935\u0938\u0902\u0930\u091a\u0928\u093e \u0914\u0930 \u0936\u093e\u0938\u0928 \u0938\u0939\u093e\u092f\u0924\u093e \u0938\u0947\u0935\u093e\u090f\u0901',
      ],
      previousBanner: '\u092a\u093f\u091b\u0932\u093e \u092c\u0948\u0928\u0930 \u0926\u093f\u0916\u093e\u090f\u0901',
      nextBanner: '\u0905\u0917\u0932\u093e \u092c\u0948\u0928\u0930 \u0926\u093f\u0916\u093e\u090f\u0901',
      goToBanner: '\u092c\u0948\u0928\u0930 \u092a\u0930 \u091c\u093e\u090f\u0901',
      tag: '\u0921\u093f\u091c\u093f\u091f\u0932 \u091c\u0928 \u0938\u0947\u0935\u093e\u090f\u0901',
      title: '\u0921\u093f\u091c\u093f\u091f\u0932 \u0936\u093e\u0938\u0928 \u0915\u0947 \u092e\u093e\u0927\u094d\u092f\u092e \u0938\u0947 \u0928\u093e\u0917\u0930\u093f\u0915 \u0938\u0936\u0915\u094d\u0924\u093f\u0915\u0930\u0923',
      subtitle: '\u0936\u093f\u0915\u093e\u092f\u0924 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902, \u092a\u094d\u0930\u0917\u0924\u093f \u0926\u0947\u0916\u0947\u0902 \u0914\u0930 \u091c\u0935\u093e\u092c\u0926\u0947\u0939\u0940 \u0938\u0941\u0928\u093f\u0936\u094d\u091a\u093f\u0924 \u0915\u0930\u0947\u0902\u0964',
      lodgeComplaint: '\u0936\u093f\u0915\u093e\u092f\u0924 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902',
      trackStatus: '\u0938\u094d\u0925\u093f\u0924\u093f \u091f\u094d\u0930\u0948\u0915 \u0915\u0930\u0947\u0902',
    },
    map: {
      fallbackTitle: '\u0935\u093e\u0930\u094d\u0921 \u0936\u093f\u0915\u093e\u092f\u0924 \u092e\u093e\u0928\u091a\u093f\u0924\u094d\u0930',
      fallbackDescription: '\u0935\u093e\u0930\u094d\u0921\u0935\u093e\u0930 \u0936\u093f\u0915\u093e\u092f\u0924 \u0935\u093f\u0924\u0930\u0923 \u0932\u094b\u0921 \u0939\u094b \u0930\u0939\u093e \u0939\u0948\u0964',
      title: '\u0935\u093e\u0930\u094d\u0921 \u0936\u093f\u0915\u093e\u092f\u0924 \u092e\u093e\u0928\u091a\u093f\u0924\u094d\u0930',
      description:
        '\u0926\u0942\u0930 \u0915\u0947 \u0926\u0943\u0936\u094d\u092f \u092e\u0947\u0902 \u0918\u0928\u0924\u094d\u0935 \u0926\u093f\u0916\u093e\u0908 \u0926\u0947\u0924\u093e \u0939\u0948\u0964 \u0935\u093e\u0930\u094d\u0921 \u0905\u0932\u0917-\u0905\u0932\u0917 \u0926\u0947\u0916\u0928\u0947 \u0914\u0930 \u0938\u0902\u0916\u094d\u092f\u093e \u091c\u093e\u0928\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u095b\u0942\u092e \u0915\u0930\u0947\u0902\u0964',
      ariaLabel: '\u0935\u093e\u0930\u094d\u0921\u0935\u093e\u0930 \u0936\u093f\u0915\u093e\u092f\u0924 \u0935\u093f\u0924\u0930\u0923 \u092e\u093e\u0928\u091a\u093f\u0924\u094d\u0930',
      complaints: '\u0936\u093f\u0915\u093e\u092f\u0924\u0947\u0902',
      zone: '\u095b\u094b\u0928',
      wards: '\u0935\u093e\u0930\u094d\u0921',
      totalComplaints: '\u0915\u0941\u0932 \u0936\u093f\u0915\u093e\u092f\u0924\u0947\u0902',
      wardCluster: '\u0935\u093e\u0930\u094d\u0921 \u0938\u092e\u0942\u0939',
      delhi: '\u0926\u093f\u0932\u094d\u0932\u0940',
    },
    footer: {
      topTitle: '\u0926\u093f\u0932\u094d\u0932\u0940 \u0930\u093e\u0937\u094d\u091f\u094d\u0930\u0940\u092f \u0930\u093e\u091c\u0927\u093e\u0928\u0940 \u0915\u094d\u0937\u0947\u0924\u094d\u0930 \u0938\u0930\u0915\u093e\u0930 | \u0926\u093f\u0932\u094d\u0932\u0940 \u0928\u0917\u0930 \u0928\u093f\u0917\u092e',
      topSubtitle: '\u0906\u0927\u093f\u0915\u093e\u0930\u093f\u0915 \u0932\u094b\u0915 \u0936\u093f\u0915\u093e\u092f\u0924 \u0928\u093f\u0935\u093e\u0930\u0923 \u092a\u094b\u0930\u094d\u091f\u0932',
      about: '\u092a\u0930\u093f\u091a\u092f',
      aboutTitle: 'GovCRM \u092a\u094b\u0930\u094d\u091f\u0932',
      aboutDescription:
        '\u0928\u093e\u0917\u0930\u093f\u0915\u094b\u0902 \u0915\u0947 \u0932\u093f\u090f \u0906\u0927\u093f\u0915\u093e\u0930\u093f\u0915 \u0936\u093f\u0915\u093e\u092f\u0924 \u0928\u093f\u0935\u093e\u0930\u0923 \u092a\u094d\u0930\u0923\u093e\u0932\u0940\u0964 \u0936\u093f\u0915\u093e\u092f\u0924 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902, \u0938\u094d\u0925\u093f\u0924\u093f \u0926\u0947\u0916\u0947\u0902 \u0914\u0930 \u0935\u093f\u092d\u093e\u0917\u094b\u0902 \u092e\u0947\u0902 \u091c\u0935\u093e\u092c\u0926\u0947\u0939\u0940 \u0938\u0941\u0928\u093f\u0936\u094d\u091a\u093f\u0924 \u0915\u0930\u0947\u0902\u0964',
      citizenServices: '\u0928\u093e\u0917\u0930\u093f\u0915 \u0938\u0947\u0935\u093e\u090f\u0901',
      policies: '\u0928\u0940\u0924\u093f\u092f\u093e\u0901',
      contactAuthority: '\u0938\u0902\u092a\u0930\u094d\u0915 \u0914\u0930 \u092a\u094d\u0930\u093e\u0927\u093f\u0915\u093e\u0930',
      citizenLinks: {
        lodgeComplaint: '\u0936\u093f\u0915\u093e\u092f\u0924 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902',
        trackComplaint: '\u0936\u093f\u0915\u093e\u092f\u0924 \u091f\u094d\u0930\u0948\u0915 \u0915\u0930\u0947\u0902',
        faqs: '\u0938\u093e\u092e\u093e\u0928\u094d\u092f \u092a\u094d\u0930\u0936\u094d\u0928',
        howItWorks: '\u092f\u0939 \u0915\u0948\u0938\u0947 \u0915\u093e\u0930\u094d\u092f \u0915\u0930\u0924\u093e \u0939\u0948',
      },
      policyLinks: {
        privacyPolicy: '\u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e \u0928\u0940\u0924\u093f',
        terms: '\u0928\u093f\u092f\u092e \u090f\u0935\u0902 \u0936\u0930\u094d\u0924\u0947\u0902',
        disclaimer: '\u0905\u0938\u094d\u0935\u0940\u0915\u0930\u0923',
      },
      importantLinks: '\u092e\u0939\u0924\u094d\u0935\u092a\u0942\u0930\u094d\u0923 \u0932\u093f\u0902\u0915',
      disclaimer: '\u0905\u0938\u094d\u0935\u0940\u0915\u0930\u0923',
      disclaimerText:
        '\u092f\u0939 \u092a\u094b\u0930\u094d\u091f\u0932 \u0915\u0947\u0935\u0932 \u0928\u093e\u0917\u0930\u093f\u0915 \u0936\u093f\u0915\u093e\u092f\u0924 \u0928\u093f\u0935\u093e\u0930\u0923 \u0915\u0947 \u0932\u093f\u090f \u0939\u0948\u0964 \u0906\u0930\u091f\u0940\u0906\u0908 \u0935\u093f\u0937\u092f, \u0928\u094d\u092f\u093e\u092f\u093e\u0932\u092f\u0940\u0928 \u092e\u093e\u092e\u0932\u0947 \u0914\u0930 \u0928\u0940\u0924\u093f\u0917\u0924 \u0935\u093f\u0937\u092f \u092f\u0939\u093e\u0901 \u0928\u0939\u0940\u0902 \u0932\u093f\u090f \u091c\u093e\u0924\u0947 \u0939\u0948\u0902\u0964',
      ownedBy: '\u0938\u094d\u0935\u093e\u092e\u093f\u0924\u094d\u0935:',
      developedBy: '\u0935\u093f\u0915\u0938\u093f\u0924 \u0926\u094d\u0935\u093e\u0930\u093e:',
      rightsReserved: '\u0938\u0930\u094d\u0935\u093e\u0927\u093f\u0915\u093e\u0930 \u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924',
      lastUpdated: '\u0905\u0902\u0924\u093f\u092e \u0905\u0926\u094d\u092f\u0924\u0928',
    },
  },
} as const

type LandingLanguageContextValue = {
  language: LandingLanguage
  setLanguage: (language: LandingLanguage) => void
  t: (typeof landingTranslations)[LandingLanguage]
}

const LandingLanguageContext = createContext<LandingLanguageContextValue | null>(null)

export function LandingLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LandingLanguage>('en')

  useLayoutEffect(() => {
    const storedLanguage = window.localStorage.getItem(STORAGE_KEY)
    if (storedLanguage === 'en' || storedLanguage === 'hi') {
      setLanguage(storedLanguage)
    }
  }, [])

  const value = useMemo<LandingLanguageContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage) => {
        setLanguage(nextLanguage)
        window.localStorage.setItem(STORAGE_KEY, nextLanguage)
      },
      t: landingTranslations[language],
    }),
    [language],
  )

  return <LandingLanguageContext.Provider value={value}>{children}</LandingLanguageContext.Provider>
}

export function useLandingLanguage() {
  const context = useContext(LandingLanguageContext)

  if (!context) {
    throw new Error('useLandingLanguage must be used within LandingLanguageProvider')
  }

  return context
}
