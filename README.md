
<h1 style="
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
  font-size:48px;
  font-weight:700;
  line-height:1.25;
  text-align:center;
  margin:0 0 24px;">
  AgentNetTool
</h1>

<p align="center">
&nbsp&nbsp🌐 <a href="https://opencua.xlang.ai/">Website</a>&nbsp&nbsp | &nbsp&nbsp📑 <a href="https://arxiv.org/abs/2508.09123">Paper</a>&nbsp&nbsp | &nbsp&nbsp🤗 <a href="https://huggingface.co/datasets/xlangai/AgentNet">Dataset</a>&nbsp&nbsp | &nbsp&nbsp🤖 <a href="https://huggingface.co/collections/xlangai/opencua-open-foundations-for-computer-use-agents-6882014ebecdbbe46074a68d">Model</a>&nbsp&nbsp | &nbsp&nbsp🔧  <a href="https://agentnet-tool.xlang.ai/">Tool Document</a>&nbsp&nbsp | &nbsp&nbsp🎮  <a href="https://huggingface.co/spaces/xlangai/OpenCUA-demo">Model Demo</a>&nbsp&nbsp 
</p>

This is the code base of AgentNetTool in [OpenCUA: Open Foundations for Computer-Use Agents](https://opencua.xlang.ai/). AgentNetTool is a cross-platform software to annotate computer-use agent tasks. It can record the full video with all the keyboard and mouse inputs as well as the other important system meta data (HTML, A11ytree elements, ...) during the annotator performing the task. 

## Document: Installation, Setup and User Guidelines
To use the AgentNetTool out of box, you can directly install AgentNetTool on your computer. Please follow the [AgentNetTool Documentation](https://agentnet-tool.xlang.ai/). The guide covers downloading, installation, setup, and instructions on how to start annotating with the tool.

## Build from source
If you’d like to build the tool from source or modify its code, please follow the instructions below.

Have Python >=3.11.

Clone this repo and `cd` into it:
```bash
$ git clone https://github.com/xlang-ai/AgentNetTool.git
$ cd AgentNetTool
```

Install the dependencies for this project:
```bash
$ pip install -r requirements.txt
$ cd agentnet-annotator
$ npm install
```

Build the application:
```bash
$ npm run build-flask  # build backend
$ npm run make
```

The built application should be located in the generated `agentnet-annotator/out` directory, where you may find the software icon to start the tool. After this, follow the remaining relevant setup instructions in the document to set up OBS, plugin and other required configurations. 

Note: If you'd like to build the tool on Ubuntu, please use Ubuntu 22.04.

## Acknowledge
<p>
We thank Yu Su, Caiming Xiong, and the anonymous reviewers for their insightful discussions and valuable feedback. 
We are grateful to Moonshot AI for providing training infrastructure and annotated data. 
We also sincerely appreciate Hao Yang, Zhengtao Wang, and Yanxu Chen from the Kimi Team for their strong infrastructure support and helpful guidance. 
The development of our tool is based on the open-source projects-<a href="https://github.com/TheDuckAI/DuckTrack" target="_blank">DuckTrack</a> and <a href="https://github.com/OpenAdaptAI/OpenAdapt" target="_blank">OpenAdapt</a>. 
We are very grateful to their commitment to the open source community. Finally, we extend our deepest thanks to all annotators for their tremendous effort and contributions to this project.
</p>

## Research Use and Disclaimer

OpenCUA is intended for **research and educational purposes only**. 

### Prohibited Uses
- The model, dataset, tool, and code may **not** be used for any purpose or activity that violates applicable laws or regulations in any jurisdiction
- Use for illegal, unethical, or harmful activities is strictly prohibited

### Disclaimer
- The authors, contributors, and copyright holders are **not responsible** for any illegal, unethical, or harmful use of the Software, nor for any direct or indirect damages resulting from such use
- Use of the "OpenCUA" name, logo, or trademarks does **not** imply any endorsement or affiliation unless separate written permission is obtained
- Users are solely responsible for ensuring their use complies with applicable laws and regulations

## Citation

If you use OpenCUA in your research, please cite our work:

```bibtex
@misc{wang2025opencuaopenfoundationscomputeruse,
      title={OpenCUA: Open Foundations for Computer-Use Agents}, 
      author={Xinyuan Wang and Bowen Wang and Dunjie Lu and Junlin Yang and Tianbao Xie and Junli Wang and Jiaqi Deng and Xiaole Guo and Yiheng Xu and Chen Henry Wu and Zhennan Shen and Zhuokai Li and Ryan Li and Xiaochuan Li and Junda Chen and Boyuan Zheng and Peihang Li and Fangyu Lei and Ruisheng Cao and Yeqiao Fu and Dongchan Shin and Martin Shin and Jiarui Hu and Yuyan Wang and Jixuan Chen and Yuxiao Ye and Danyang Zhang and Dikang Du and Hao Hu and Huarong Chen and Zaida Zhou and Haotian Yao and Ziwei Chen and Qizheng Gu and Yipu Wang and Heng Wang and Diyi Yang and Victor Zhong and Flood Sung and Y. Charles and Zhilin Yang and Tao Yu},
      year={2025},
      eprint={2508.09123},
      archivePrefix={arXiv},
      primaryClass={cs.AI},
      url={https://arxiv.org/abs/2508.09123}, 
}
```

