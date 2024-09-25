import { components } from "./types/api";

const VALID_LOCATIONS: string[] = [
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

function isAddressTriggerTypeChanged(
    sendblocksFunctionTrigger: components["schemas"]["AddressTriggerData"],
    specFunctionTrigger: components["schemas"]["AddressTriggerData"],
): boolean {
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
        const specialCase =
            !specFunctionTrigger.locations && sendblocksFunctionTrigger.locations?.length == VALID_LOCATIONS.length;
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

function isEventTriggerTypeChanged(
    sendblocksFunctionTrigger: components["schemas"]["EventTriggerData"],
    specFunctionTrigger: components["schemas"]["EventTriggerData"],
): boolean {
    if (sendblocksFunctionTrigger.event != specFunctionTrigger.event) {
        return true;
    }
    if (
        sendblocksFunctionTrigger.emitter_address?.toLowerCase() != specFunctionTrigger.emitter_address?.toLowerCase()
    ) {
        return true;
    }
    return false;
}

function isFunctionTriggerTypeChanged(
    sendblocksFunctionTrigger: components["schemas"]["FunctionTriggerData"],
    specFunctionTrigger: components["schemas"]["FunctionTriggerData"],
): boolean {
    if (sendblocksFunctionTrigger.function != specFunctionTrigger.function) {
        return true;
    }
    return false;
}

function isStorageAccessTriggerVariableChanged(
    sendblocksFunctionTriggerVariable: any,
    specFunctionTriggerVariable: any,
): boolean {
    if (sendblocksFunctionTriggerVariable.variable_name != specFunctionTriggerVariable.variable_name) {
        return true;
    }
    if (sendblocksFunctionTriggerVariable.variable_slot != specFunctionTriggerVariable.variable_slot) {
        return true;
    }
    return false;
}

function isStorageAccessTriggerTypeChanged(
    sendblocksFunctionTrigger: components["schemas"]["StorageTriggerData"],
    specFunctionTrigger: components["schemas"]["StorageTriggerData"],
): boolean {
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

export function areFunctionTriggersChanged(
    sendblocksFunctionTriggers: (
        | components["schemas"]["AddressTriggerData"]
        | components["schemas"]["EventTriggerData"]
        | components["schemas"]["FunctionTriggerData"]
        | components["schemas"]["NewBlockTriggerData"]
        | components["schemas"]["NewContractTriggerData"]
        | components["schemas"]["StorageTriggerData"]
    )[],
    specFunctionTriggers: (
        | components["schemas"]["AddressTriggerData"]
        | components["schemas"]["EventTriggerData"]
        | components["schemas"]["FunctionTriggerData"]
        | components["schemas"]["NewBlockTriggerData"]
        | components["schemas"]["NewContractTriggerData"]
        | components["schemas"]["StorageTriggerData"]
    )[],
): boolean {
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

export function isFunctionTriggerChanged(
    sendblocksFunctionTrigger:
        | components["schemas"]["AddressTriggerData"]
        | components["schemas"]["EventTriggerData"]
        | components["schemas"]["FunctionTriggerData"]
        | components["schemas"]["NewBlockTriggerData"]
        | components["schemas"]["NewContractTriggerData"]
        | components["schemas"]["StorageTriggerData"],
    specFunctionTrigger:
        | components["schemas"]["AddressTriggerData"]
        | components["schemas"]["EventTriggerData"]
        | components["schemas"]["FunctionTriggerData"]
        | components["schemas"]["NewBlockTriggerData"]
        | components["schemas"]["NewContractTriggerData"]
        | components["schemas"]["StorageTriggerData"],
): boolean {
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
            break;
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

function validateAddressTriggerType(trigger: components["schemas"]["AddressTriggerData"]) {
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

function validateEventTriggerType(trigger: components["schemas"]["EventTriggerData"]) {
    const errorPrefix = "Invalid Event Trigger:";
    // we require at least the event signature
    if (!trigger.event) {
        throw new Error(`${errorPrefix} Event signature is required.`);
    }
    return true;
}

function validateFunctionTriggerType(trigger: components["schemas"]["FunctionTriggerData"]): boolean {
    const errorPrefix = "Invalid Function Trigger:";
    if (!trigger.function) {
        throw new Error(`${errorPrefix} Function is required.`);
    }
    return true;
}

function validateStorageAccessTriggerVariableType(variable: any): boolean {
    const errorPrefix = "Invalid Storage Access Trigger Variable:";
    if (!(variable.variable_name || variable.variable_slot)) {
        throw new Error(`${errorPrefix} Variable name or slot is required.`);
    }
    return true;
}

function validateStorageAccessTriggerType(trigger: components["schemas"]["StorageTriggerData"]) {
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

export function validateFunctionTrigger(
    trigger:
        | components["schemas"]["AddressTriggerData"]
        | components["schemas"]["EventTriggerData"]
        | components["schemas"]["FunctionTriggerData"]
        | components["schemas"]["NewBlockTriggerData"]
        | components["schemas"]["NewContractTriggerData"]
        | components["schemas"]["StorageTriggerData"],
) {
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
