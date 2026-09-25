import test from 'node:test';
import assert from 'node:assert/strict';
import {distanceMetres,locationCadence,installationSchema} from '../../../packages/contracts/src/operations.ts';
test('stationary uploads use a lower cadence and coordinate jump measurement is geographic',()=>{
 assert.equal(locationCadence(null),60000);assert.equal(locationCadence(0),60000);assert.equal(locationCadence(10),15000);
 assert.equal(distanceMetres({latitude:-33.92,longitude:18.42},{latitude:-33.92,longitude:18.42}),0);
 assert.ok(distanceMetres({latitude:-33.92,longitude:18.42},{latitude:-33.92,longitude:18.7})>25000);
});
test('installation validation rejects arbitrary push addresses and weak identity secrets',()=>{
 const value={installation_id:'9bef7543-8e8c-407a-8cd7-4c65e955785c',installation_secret:'a'.repeat(64),expo_token:'ExpoPushToken[abc123_foo-bar]',platform:'ios'};
 assert.ok(installationSchema.safeParse(value).success);
 assert.ok(!installationSchema.safeParse({...value,expo_token:'https://example.test'}).success);
 assert.ok(!installationSchema.safeParse({...value,installation_secret:'short'}).success);
});
