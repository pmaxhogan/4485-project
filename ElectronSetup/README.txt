Project Setup:

Step 1: Install Node.js

run the DependencyInstaller.msi (MSI)
After installation, restart your system to ensure Node.js is properly configured.


Step 2: Set Up Project Scaffolding

Use the batch files in the project directory to set up the Electron Vite project with Vue:

ProjectSetup.bat: This batch file installs all required dependencies for Electron, Vite, and Vue, then launches the Electron application locally with the configured Vue frontend and Vite build.

Step 3: Running the Project Again

If you want to run the project again later, use the StartProject.bat file.



Explanation of the Batch Files (stupidly useless but what can you do)
1.bat:
Installs the necessary dependencies for Electron, Vue, and Vite using the electron-vite setup.

2.bat:
Further installs a stubborn dependency inside of your project folder

StartProject.bat:
This batch file restarts the Electron app with Vue and Vite


Electron Vite + Vue Setup

Electron Vite:
A combination of Electron (for building desktop apps) with Vite (a build tool) to make development faster and more efficient. This setup includes Vue as the front-end framework.

Vite:
The build tool provides optimized performance and fast reload times, making it ideal for rapid development.

Vue.js:
Vue powers the front-end UI of the Electron app, providing a flexible, reactive, and component-based architecture.

Additional Information
The Electron app will launch using Vite to handle the local development server and Vue for UI.
If any dependencies are missing or updates are required, simply rerun the InstallDependencies.bat script

Debugging
if you make your own subdirectory within ElectronSetup, it will break StartProject.bat and you will have to use "npm run dev" inside of the project folder.
