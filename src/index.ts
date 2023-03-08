import { prompt } from 'enquirer';
import fs from 'fs-extra';
import path from 'path';

const RESERVED_KEYS = [ 'meta', 'hasDirDefinition', 'dirPath' ];
const WITHOUT_ALL_OF_THE_REST = 'Without any other option';

const fallbackMetaData: MetaData = {
  name: 'option',
  description: 'no description provided'
};

type MetaData = {
  name: string;
  description: string;
  messages ?: Partial<{
    'option-text' : string,
    'after-message' : string,
    'before-message': string
  }>
}

const globalOptions = {
  projectName: ''
};

async function filterDirectories(rootPath: string, allDirsOrFiles: string[]){
  return allDirsOrFiles.filter((dirOrFile)=>{
    const pathToDirOrFile = path.resolve(rootPath, dirOrFile);
    const statsForDirOrFile = fs.statSync(pathToDirOrFile);

    if(statsForDirOrFile.isDirectory()){
      return true;  
    }
    return false;
  });
}

function safeParseJson(json: string){
  try{
    const jsonData = JSON.parse(json);
    return jsonData;
  }
  catch(e){
    return {};
  }
}

async function readMetaJson(metaDirPath: string){
  const metaJsonPath = path.resolve(metaDirPath, 'meta.json');
  let metaJsonContent: undefined | object = undefined;
  if(fs.existsSync(metaJsonPath)){
    metaJsonContent = safeParseJson(fs.readFileSync(metaJsonPath).toString());
  }
  return metaJsonContent as MetaData;
}

async function buildOptions(defaultPath: string){

  const templateDirectoryPath = path.resolve(defaultPath);
  const allDirChoices = fs.readdirSync(templateDirectoryPath);

  let options = await filterDirectories(templateDirectoryPath, allDirChoices); 
  const metaContent = await readMetaJson(templateDirectoryPath);

  const constructedOptions = {
    meta: metaContent,
    hasDirDefinition: false,
    dirPath: ''
  };

  if(options.includes('dir')){
    constructedOptions.hasDirDefinition = true;
    constructedOptions.dirPath = path.resolve(templateDirectoryPath, 'dir');
    options = options.filter(opt=> opt !== 'dir');
  }

  for(const option of options){

    constructedOptions[option] = await buildOptions(path.resolve(defaultPath, option));
  }

  return constructedOptions;

}

async function copyDirToCWD(directoryPath: string, destinationPath: string){
  try{
    fs.copySync(directoryPath, destinationPath); 
  }
  
  catch(e){
    console.error('some error occurred');
  }
}

async function buildPrompt(optionsConfig: {[key: string]: any, meta?: MetaData, hasDirDefinition?: boolean, dirPath?: string}): Promise<{dirPath: string, metaData: MetaData} | null>{
  const allOptions = Object.keys(optionsConfig);
  const allOptionsExceptMeta = allOptions.filter(option=>(!RESERVED_KEYS.includes(option)));

  if(allOptionsExceptMeta.length === 0) { 
    if(optionsConfig['hasDirDefinition']){
      return { 
        metaData: optionsConfig['meta'] || fallbackMetaData,
        dirPath: optionsConfig['dirPath'] || ''
      }; 
    }
    return null;
  }

  if(optionsConfig['hasDirDefinition']){
    allOptionsExceptMeta.push(WITHOUT_ALL_OF_THE_REST);
  }

  

  const choiceNames = allOptionsExceptMeta.map(option=>{ 
    return { 
      choiceName: optionsConfig[option].meta.name,
      choiceValue: option
    }; 
  });

  const pickerPrompt = await prompt<{selectedOption: string}>({
    type: 'select',
    choices: choiceNames.map(choice=>choice.choiceName),
    message: optionsConfig['meta']?.messages?.['option-text'] ?? 'Pick an option',
    name: 'selectedOption',
    result: (value)=>{
      const finalResult = choiceNames.filter(ch=>ch.choiceName === value)[0].choiceValue;
      return finalResult;
    }
  });


  const beforeMessage = optionsConfig[pickerPrompt.selectedOption]?.['meta']?.messages?.['before-message'];
  const description = optionsConfig[pickerPrompt.selectedOption]?.['meta']?.messages?.['description'];
  beforeMessage && console.log(beforeMessage);
  description && console.log(description);


  for(const singleOption of allOptions){
    if(optionsConfig['hasDirDefinition'] && pickerPrompt.selectedOption === WITHOUT_ALL_OF_THE_REST){
      return { 
        metaData: optionsConfig['meta'] ?? fallbackMetaData,
        dirPath: optionsConfig['dirPath'] ?? ''
      };
    }

    else if(pickerPrompt.selectedOption === singleOption){
      return await buildPrompt(optionsConfig[singleOption]);
    }
  }

  return null;
  

}

const timeoutId = setTimeout(()=>console.log('process timed out'), 100000);
async function main(){
  const templateDirectoryPath = path.resolve(path.dirname( __dirname ), 'templates');
  const allOptions = await buildOptions(templateDirectoryPath);


  const projectNamePrompt = await prompt<{projectName: string}>({
    type: 'input',
    name: 'projectName',
    initial: 'my-project',
    message: 'Enter project name'
  });

  globalOptions.projectName = projectNamePrompt.projectName;

  const selectedOptionData = await buildPrompt(allOptions);

  if(selectedOptionData){
    const { dirPath, metaData } = selectedOptionData;
    const targetPath = path.resolve(process.cwd(), globalOptions.projectName);
    fs.mkdirSync(targetPath);
    copyDirToCWD(dirPath, targetPath);

    if(metaData){
      if(metaData.messages?.['after-message']){
        console.log(metaData.messages?.['after-message']);
      }
    }

  }

  //the process can exit now
  clearTimeout(timeoutId);
}

main();
