/**
 * @micboxx/contracts
 *
 * Shared platform type definitions for the MicBoxx API surface.
 * These contracts are consumed by both the consumer and creator apps.
 *
 * App-specific contracts (e.g., creator dashboard types) remain in
 * their respective app's src/contracts/ directory and may import
 * from this package to extend shared types.
 */

export * from './commerce';
export * from './dashboard';
export * from './micboxx';
export * from './registration';
export * from './rooms';
export * from './social';
export * from './player';
