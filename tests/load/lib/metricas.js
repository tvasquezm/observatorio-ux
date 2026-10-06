import { Rate } from 'k6/metrics';

export const flowErrors = new Rate('flow_errors');
