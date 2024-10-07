"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFunctionTrigger = exports.isFunctionTriggerChanged = exports.areFunctionTriggersChanged = void 0;
const VALID_LOCATIONS = [
    "trace_to",
    "trace_from",
    "trace_input",
    "trace_output",
    "log_emitter",
    "log_topic",
    "log_data",
    "storage_key",
    "storage_value",
    "storage_address",
];
function isAddressTriggerTypeChanged(sendblocksFunctionTrigger, specFunctionTrigger) {
    var _a;
    if (sendblocksFunctionTrigger.address.toLowerCase() != specFunctionTrigger.address.toLowerCase()) {
        return true;
    }
    // convert location arrays to sets and back to arrays to remove duplicates
    const sendblocksLocations = sendblocksFunctionTrigger.locations
        ? [...new Set(sendblocksFunctionTrigger.locations)]
        : [];
    const specLocations = specFunctionTrigger.locations ? [...new Set(specFunctionTrigger.locations)] : [];
    if (sendblocksLocations.length != specLocations.length) {
        // special case: if the spec locations are null, and the sendblocks locations include every
        //               location, we consider the trigger to be the same.
        // TODO: remove this special case, see https://app.clickup.com/t/9003190095/8695u071p
        const specialCase = !specFunctionTrigger.locations && ((_a = sendblocksFunctionTrigger.locations) === null || _a === void 0 ? void 0 : _a.length) == VALID_LOCATIONS.length;
        if (!specialCase) {
            return true;
        }
    }
    // check that each location in the spec triggers is in the sendblocks triggers
    for (const specItem of specLocations) {
        if (!sendblocksLocations.includes(specItem)) {
            return true;
        }
    }
    return false;
}
function isEventTriggerTypeChanged(sendblocksFunctionTrigger, specFunctionTrigger) {
    var _a, _b;
    if (sendblocksFunctionTrigger.event != specFunctionTrigger.event) {
        return true;
    }
    if (((_a = sendblocksFunctionTrigger.emitter_address) === null || _a === void 0 ? void 0 : _a.toLowerCase()) != ((_b = specFunctionTrigger.emitter_address) === null || _b === void 0 ? void 0 : _b.toLowerCase())) {
        return true;
    }
    return false;
}
function isContractTriggerTypeChanged(sendblocksFunctionTrigger, specFunctionTrigger) {
    var _a, _b;
    return (((_a = sendblocksFunctionTrigger.deployer_address) === null || _a === void 0 ? void 0 : _a.toLowerCase()) != ((_b = specFunctionTrigger.deployer_address) === null || _b === void 0 ? void 0 : _b.toLowerCase()));
}
function isFunctionTriggerTypeChanged(sendblocksFunctionTrigger, specFunctionTrigger) {
    if (sendblocksFunctionTrigger.function != specFunctionTrigger.function) {
        return true;
    }
    return false;
}
function isStorageAccessTriggerVariableChanged(sendblocksFunctionTriggerVariable, specFunctionTriggerVariable) {
    if (sendblocksFunctionTriggerVariable.variable_name != specFunctionTriggerVariable.variable_name) {
        return true;
    }
    if (sendblocksFunctionTriggerVariable.variable_slot != specFunctionTriggerVariable.variable_slot) {
        return true;
    }
    return false;
}
function isStorageAccessTriggerTypeChanged(sendblocksFunctionTrigger, specFunctionTrigger) {
    if (sendblocksFunctionTrigger.storage_address.toLowerCase() != specFunctionTrigger.storage_address.toLowerCase()) {
        return true;
    }
    if (sendblocksFunctionTrigger.follow_proxy != specFunctionTrigger.follow_proxy) {
        return true;
    }
    if (isStorageAccessTriggerVariableChanged(sendblocksFunctionTrigger.variable, specFunctionTrigger.variable)) {
        return true;
    }
    return false;
}
function areFunctionTriggersChanged(sendblocksFunctionTriggers, specFunctionTriggers) {
    if (sendblocksFunctionTriggers.length != specFunctionTriggers.length) {
        return true;
    }
    const numTriggers = sendblocksFunctionTriggers.length;
    let numMatches = 0;
    const sendblocksFunctionTriggersCopy = [...sendblocksFunctionTriggers];
    // for each spec trigger, compare against all the sendblocks triggers.
    for (const specFunctionTrigger of specFunctionTriggers) {
        for (let i = 0; i < sendblocksFunctionTriggersCopy.length; i++) {
            const sendblocksFunctionTrigger = sendblocksFunctionTriggersCopy[i];
            if (sendblocksFunctionTrigger.type == specFunctionTrigger.type) {
                if (!isFunctionTriggerChanged(sendblocksFunctionTrigger, specFunctionTrigger)) {
                    numMatches++;
                    // remove the matched trigger from the list
                    sendblocksFunctionTriggersCopy.splice(i, 1);
                }
            }
        }
    }
    if (numMatches == numTriggers) {
        return false;
    }
    return true;
}
exports.areFunctionTriggersChanged = areFunctionTriggersChanged;
function isFunctionTriggerChanged(sendblocksFunctionTrigger, specFunctionTrigger) {
    if (sendblocksFunctionTrigger.type != specFunctionTrigger.type) {
        return true;
    }
    // our switch cases need to check the types because typescript doesn't infer
    // that at this point we already know they're of the same type
    switch (sendblocksFunctionTrigger.type) {
        case "TRIGGER_TYPE_ADDRESS":
            if (specFunctionTrigger.type != "TRIGGER_TYPE_ADDRESS") {
                throw new Error("Trigger type mismatch.");
            }
            return isAddressTriggerTypeChanged(sendblocksFunctionTrigger, specFunctionTrigger);
        case "TRIGGER_TYPE_EVENT":
            if (specFunctionTrigger.type != "TRIGGER_TYPE_EVENT") {
                throw new Error("Trigger type mismatch.");
            }
            return isEventTriggerTypeChanged(sendblocksFunctionTrigger, specFunctionTrigger);
        case "TRIGGER_TYPE_FUNCTION":
            if (specFunctionTrigger.type != "TRIGGER_TYPE_FUNCTION") {
                throw new Error("Trigger type mismatch.");
            }
            return isFunctionTriggerTypeChanged(sendblocksFunctionTrigger, specFunctionTrigger);
        case "TRIGGER_TYPE_NEW_BLOCK":
            break;
        case "TRIGGER_TYPE_NEW_CONTRACT":
            if (specFunctionTrigger.type != "TRIGGER_TYPE_NEW_CONTRACT") {
                throw new Error("Trigger type mismatch.");
            }
            return isContractTriggerTypeChanged(sendblocksFunctionTrigger, specFunctionTrigger);
        case "TRIGGER_TYPE_STORAGE_ACCESS":
            if (specFunctionTrigger.type != "TRIGGER_TYPE_STORAGE_ACCESS") {
                throw new Error("Trigger type mismatch.");
            }
            return isStorageAccessTriggerTypeChanged(sendblocksFunctionTrigger, specFunctionTrigger);
        default:
            throw new Error(`Unsupported trigger type: ${specFunctionTrigger.type}`);
    }
    return false;
}
exports.isFunctionTriggerChanged = isFunctionTriggerChanged;
function validateAddressTriggerType(trigger) {
    const errorPrefix = "Invalid Address Trigger:";
    if (!trigger.address) {
        throw new Error(`${errorPrefix} Address is required.`);
    }
    if (trigger.locations) {
        for (const location of trigger.locations) {
            if (!VALID_LOCATIONS.includes(location)) {
                throw new Error(`${errorPrefix} Invalid location ${location}.`);
            }
        }
    }
    return true;
}
function validateEventTriggerType(trigger) {
    const errorPrefix = "Invalid Event Trigger:";
    // we require at least the event signature
    if (!trigger.event) {
        throw new Error(`${errorPrefix} Event signature is required.`);
    }
    return true;
}
function validateFunctionTriggerType(trigger) {
    const errorPrefix = "Invalid Function Trigger:";
    if (!trigger.function) {
        throw new Error(`${errorPrefix} Function is required.`);
    }
    return true;
}
function validateStorageAccessTriggerVariableType(variable) {
    const errorPrefix = "Invalid Storage Access Trigger Variable:";
    if (!(variable.variable_name || variable.variable_slot)) {
        throw new Error(`${errorPrefix} Variable name or slot is required.`);
    }
    return true;
}
function validateStorageAccessTriggerType(trigger) {
    const errorPrefix = "Invalid Storage Access Trigger:";
    if (!trigger.storage_address) {
        throw new Error(`${errorPrefix} Storage address is required.`);
    }
    if (!trigger.variable) {
        throw new Error(`${errorPrefix} Variable is required.`);
    }
    validateStorageAccessTriggerVariableType(trigger.variable);
    return true;
}
function validateFunctionTrigger(trigger) {
    if (!trigger) {
        throw new Error("Trigger is required.");
    }
    const triggerType = trigger.type;
    switch (triggerType) {
        case "TRIGGER_TYPE_ADDRESS":
            return validateAddressTriggerType(trigger);
        case "TRIGGER_TYPE_EVENT":
            return validateEventTriggerType(trigger);
        case "TRIGGER_TYPE_FUNCTION":
            return validateFunctionTriggerType(trigger);
        case "TRIGGER_TYPE_NEW_BLOCK":
            break;
        case "TRIGGER_TYPE_NEW_CONTRACT":
            break;
        case "TRIGGER_TYPE_STORAGE_ACCESS":
            return validateStorageAccessTriggerType(trigger);
        default:
            throw new Error(`${triggerType} not recognized. A valid trigger type is required.`);
    }
    return true;
}
exports.validateFunctionTrigger = validateFunctionTrigger;
//# sourceMappingURL=function-triggers.js.map