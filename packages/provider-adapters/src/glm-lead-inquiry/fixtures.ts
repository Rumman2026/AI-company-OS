import type { LeadInquiryClassificationRequest, LeadInquiryClassificationResult } from './types';

// Deterministic request/response fixture pairs for the representative
// scenarios required by docs/cloud/GLM_SANDBOX_PILOT.md Stage 5. Every
// "response" here is what a real GLM call would be expected to return —
// none of it comes from a real API call.

export const residentialRoofWashRequest: LeadInquiryClassificationRequest = {
  taskId: 'pilot-residential-roof-wash',
  inquiryText:
    'Hi, I have moss buildup on my roof and would like it cleaned. It is a single-story house in San Diego.',
  contactChannel: 'quote-form',
};

export const residentialRoofWashResponse: LeadInquiryClassificationResult = {
  intentCategory: 'residential',
  propertyType: 'single-story residential house',
  serviceIntent: 'roof cleaning to remove moss buildup',
  summary: 'Homeowner requests roof cleaning to remove moss buildup on a single-story house.',
  missingInformation: ['exact service address', 'roof material/type', 'preferred timeframe'],
  recommendedTemplateId: 'template-residential-info-request',
  confidence: 0.92,
  requiresEscalation: false,
  escalationReasons: [],
};

export const commercialGasStationRequest: LeadInquiryClassificationRequest = {
  taskId: 'pilot-commercial-gas-station',
  inquiryText:
    'We manage a gas station and need the fuel canopy and concrete pad pressure washed monthly. Please advise.',
  contactChannel: 'email',
};

export const commercialGasStationResponse: LeadInquiryClassificationResult = {
  intentCategory: 'commercial',
  propertyType: 'gas station',
  serviceIntent: 'recurring monthly fuel canopy and concrete pad pressure washing',
  summary:
    'Gas station manager requests recurring monthly cleaning of the fuel canopy and concrete pad.',
  missingInformation: ['site address', 'canopy square footage', 'access hours/restrictions'],
  recommendedTemplateId: 'template-commercial-info-request',
  confidence: 0.9,
  requiresEscalation: false,
  escalationReasons: [],
};

export const hoaSidewalkRequest: LeadInquiryClassificationRequest = {
  taskId: 'pilot-hoa-sidewalk',
  inquiryText:
    'Our HOA board is looking for a vendor to clean the community sidewalks and common-area walkways.',
  contactChannel: 'phone-transcript',
};

export const hoaSidewalkResponse: LeadInquiryClassificationResult = {
  intentCategory: 'hoa',
  propertyType: 'HOA community with shared walkways',
  serviceIntent: 'sidewalk and common-area walkway cleaning',
  summary: 'HOA board requests sidewalk and common-area walkway cleaning across the community.',
  missingInformation: [
    'total linear footage',
    'number of buildings/sections',
    'HOA point of contact',
  ],
  recommendedTemplateId: 'template-hoa-info-request',
  confidence: 0.88,
  requiresEscalation: false,
  escalationReasons: [],
};

// Exact synthetic inquiry supplied for the real, single-call GLM pilot
// (docs/cloud/GLM_SANDBOX_PILOT.md "Real Z.AI / GLM Sandbox Credential
// and Single-Call Pilot" stage) — proven here with a mocked expected
// response before ever touching the real network.
export const hoaOrangeCountyRealPilotRequest: LeadInquiryClassificationRequest = {
  taskId: 'real-pilot-hoa-orange-county',
  inquiryText:
    'Hi, I manage an HOA community in Orange County and need pricing for recurring sidewalk and common-area pressure washing. There are several buildings and shared walkways. Please let me know what information you need for an estimate.',
  contactChannel: 'email',
};

export const hoaOrangeCountyRealPilotExpectedResponse: LeadInquiryClassificationResult = {
  intentCategory: 'hoa',
  propertyType: 'HOA community in Orange County with multiple buildings',
  serviceIntent: 'recurring sidewalk and common-area pressure washing',
  summary:
    'HOA manager requests recurring sidewalk and common-area pressure washing across a multi-building community and is asking what is needed for an estimate.',
  missingInformation: ['total linear footage', 'number of buildings', 'desired service frequency'],
  recommendedTemplateId: 'template-escalate-to-owner',
  confidence: 0.85,
  requiresEscalation: true,
  escalationReasons: ['pricing-scope-warranty-or-contract'],
};

export const unclearInquiryRequest: LeadInquiryClassificationRequest = {
  taskId: 'pilot-unclear-inquiry',
  inquiryText: 'Hey do you guys do the thing for outside cleaning? Let me know.',
  contactChannel: 'quote-form',
};

// Confidence deliberately below the default 0.6 threshold — this
// fixture exercises the low-confidence-escalated path, not a hard
// rejection, proving the confidence-threshold handling requirement.
export const unclearInquiryResponse: LeadInquiryClassificationResult = {
  intentCategory: 'unclear',
  propertyType: 'unknown',
  serviceIntent: 'unclear — general "outside cleaning" mentioned only',
  summary: 'Inquiry is too vague to determine the specific exterior cleaning service requested.',
  missingInformation: ['type of service', 'property type', 'service address'],
  recommendedTemplateId: 'template-unclear-needs-more-info',
  confidence: 0.5,
  requiresEscalation: false,
  escalationReasons: [],
};

export const spamInquiryRequest: LeadInquiryClassificationRequest = {
  taskId: 'pilot-spam-inquiry',
  inquiryText:
    'CONGRATULATIONS you have WON!!! Click here to claim your prize now www.totally-legit.example',
  contactChannel: 'quote-form',
};

export const spamInquiryResponse: LeadInquiryClassificationResult = {
  intentCategory: 'spam',
  propertyType: 'not applicable',
  serviceIntent: 'not applicable',
  summary: 'Message is unrelated promotional/spam content, not a genuine service inquiry.',
  missingInformation: [],
  recommendedTemplateId: 'template-spam-no-response',
  confidence: 0.97,
  requiresEscalation: false,
  escalationReasons: [],
};

export const angryCustomerRequest: LeadInquiryClassificationRequest = {
  taskId: 'pilot-angry-customer',
  inquiryText:
    'This is the second time I am reaching out and nobody has responded. I am extremely unhappy with the lack of communication.',
  contactChannel: 'email',
};

export const angryCustomerResponse: LeadInquiryClassificationResult = {
  intentCategory: 'out-of-scope',
  propertyType: 'unknown',
  serviceIntent: 'not a new service request — a complaint about lack of response',
  summary:
    'Customer is expressing frustration about a lack of prior response, not a new service request.',
  missingInformation: [],
  recommendedTemplateId: 'template-escalate-to-owner',
  confidence: 0.85,
  requiresEscalation: true,
  escalationReasons: ['customer-upset'],
};

export const pricingRequestRequest: LeadInquiryClassificationRequest = {
  taskId: 'pilot-pricing-request',
  inquiryText: 'How much would it cost to have my driveway and sidewalk pressure washed?',
  contactChannel: 'quote-form',
};

export const pricingRequestResponse: LeadInquiryClassificationResult = {
  intentCategory: 'residential',
  propertyType: 'residential property with driveway and sidewalk',
  serviceIntent: 'driveway and sidewalk pressure washing',
  summary: 'Homeowner is asking for a price quote for driveway and sidewalk cleaning.',
  missingInformation: ['exact square footage', 'service address'],
  recommendedTemplateId: 'template-escalate-to-owner',
  confidence: 0.9,
  requiresEscalation: true,
  escalationReasons: ['pricing-scope-warranty-or-contract'],
};

// Malformed fixture: missing a required field and carrying an
// unexpected secret-shaped property, used to prove invalid-response
// handling and secret redaction in audit logs simultaneously.
export const malformedResponseWithSecret: Record<string, unknown> = {
  intentCategory: 'residential',
  propertyType: 'single-story residential house',
  serviceIntent: 'roof cleaning',
  // summary intentionally omitted — required field missing
  missingInformation: [],
  recommendedTemplateId: 'template-residential-info-request',
  confidence: 0.9,
  requiresEscalation: false,
  escalationReasons: [],
  apiKey: 'sk-should-never-appear-in-logs',
};
