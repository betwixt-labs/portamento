import { test, expect } from 'vitest';
import {
  NamespaceDefinition,
  FieldDefinition,
  MessageDefinition,
  EnumDefinition,
  ServiceDefinition,
  MethodDefinition,
  Root,
} from './construct';
import { SyntaxType } from './ptypes';

test('NamespaceDefinition - create and get', () => {
  const ns = new NamespaceDefinition('TestNamespace', SyntaxType.NamespaceDefinition);
  ns.add(new MessageDefinition('TestMessage'));
  const message = ns.get('TestMessage');
  expect(message).toBeTruthy();
  expect(message?.name).toBe('TestMessage');
});

test('FieldDefinition - create and set properties', () => {
  const field = new FieldDefinition('testField', 1, 'string', 'optional', 'Extension', { customOption: true }, 'Test comment');
  expect(field.name).toBe('testField');
  expect(field.type.syntaxType).toBe(SyntaxType.BaseType);
  expect(field.type.value).toBe('string');
  expect(field.id).toBe(1);
  expect(field.rule).toBe(undefined);
  expect(field.optional).toBe(true);
  expect(field.extend).toBe('Extension');
  expect(field.options).toEqual({ customOption: true });
  expect(field.comment).toBe('Test comment');
});

test('MessageDefinition - create, add fields, and get fields', () => {
  const message = new MessageDefinition('TestMessage');
  const field1 = new FieldDefinition('field1', 1, 'string', 'optional', undefined, { customOption: true }, 'Field 1 comment');
  const field2 = new FieldDefinition('field2', 2, 'int32', 'repeated');
  message.add(field1);
  message.add(field2);

  const result1 = message.get('field1');
  const result2 = message.get('field2');

  expect(result1).toBe(field1);
  expect(result2).toBe(field2);
});

test('EnumDefinition - create and add', () => {
  const enumDef = new EnumDefinition('TestEnum', { A: 0, B: 1 });
  enumDef.add('C', 2);
  expect(enumDef.valuesById[2]).toBe('C');
  expect(enumDef.values.C).toBe(2);
});

test('ServiceDefinition - add method and get', () => {
  const service = new ServiceDefinition('TestService');
  service.add(new MethodDefinition('TestMethod', undefined, 'Request', 'Response'));
  const method = service.get('TestMethod');
  expect(method).toBeTruthy();
  expect(method?.name).toBe('TestMethod');
});

test('MethodDefinition - create and set properties', () => {
  const method = new MethodDefinition('TestMethod', undefined, 'Request', 'Response');
  expect(method.name).toBe('TestMethod');
  expect(method.requestType.syntaxType).toBe(SyntaxType.Identifier);
  expect(method.requestType.value).toBe('Request');
  expect(method.responseType.syntaxType).toBe(SyntaxType.Identifier);
  expect(method.responseType.value).toBe('Response');
});

test('Root - create and add namespace', () => {
  const root = new Root();
  root.add(new NamespaceDefinition('TestNamespace', SyntaxType.NamespaceDefinition));
  const namespace = root.get('TestNamespace');
  expect(namespace).toBeTruthy();
  expect(namespace?.name).toBe('TestNamespace');
});