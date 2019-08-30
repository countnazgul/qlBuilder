const common = require('../src/packages/common');

test('Correct console log output', () => {
    let outputData = "";
    storeLog = inputs => (outputData += inputs);
    console["log"] = jest.fn(storeLog);
    common.writeLog('ok', 'test', false)
    expect(outputData).toContain(`test`);
});

test('Throw error if no msg type is found', () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { });
    common.writeLog('ok1', 'test', false)
    expect(mockExit).toHaveBeenCalledWith(1);
});

test('Throw FATAL error if no msg type is found', () => {
    let outputData = "";
    storeLog = inputs => (outputData += inputs);
    console["log"] = jest.fn(storeLog);
    common.writeLog('ok1', 'test', false)
    expect(outputData).toContain(`FATAL`);
});