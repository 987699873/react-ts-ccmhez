import React, { Component } from 'react';
import {
  Upload as AutoUpload,
  Button,
  message,
  Space,
  PageHeader,
  Card,
  Modal,
} from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { Uploader } from '@q/sec_sdk';
import { getAccessToken } from 'api/demo';
import UploadForm from '../components/UploadForm';
import UploadProgress from '../components/upload-progress';
import { formatSize, formatDate } from 'utils/file';

const { Dragger } = AutoUpload;

export default class Upload extends Component {
  constructor() {
    super();
    this.isClickCancel = false;
    this.uploader = {};
  }

  state = {
    currentFileList: [],
    fileList: [],
    uploading: false,
    options: {
      qid: '2563693515', // 账号id
      env: 'test', // 环境设置 http://localhost:3001
      access_token: '9f298e2ac97a58340def750aa28d380fce98f7b8', // 签名token
      token: '168968463.4.9af7d70c.2563693515.15737973361923891.1646642697', // 云盘token
      fileEleId: 'fileSelector', // <input type="file" id="fileSelector">
      path: '/',
      concurrency: 3,
    },
    isModalVisible: false,
    dupFile: {
      isModalVisible: false,
      fname: '', // 重名文件名称
      status: '', // 重名文件状态
    },
    dupFileList: [], // 重名文件列表
    uploadModel: '',
    uploader: {},
  };

  // 开始上传文件
  handleUpload = () => {
    if (this.state.uploadModel === 'dragUpload') {
      this.setState({
        currentFileList: [],
      });
    }

    this.setState({
      uploadModel: 'handleUpload',
    });

    const { fileList } = this.state;
    const formData = new FormData();
    fileList.forEach((file) => {
      file.file_ext = {
        duration: '' + Math.round(Math.random() * 1000),
        with: '' + Math.round(Math.random() * 1000),
        height: '' + Math.round(Math.random() * 1000),
      };
      formData.append('files[]', file);
    });
    this.uploader.addFiles(fileList);
  };

  // 更新上传列表
  updateList(fileData) {
    const { currentFileList } = this.state;
    const file = fileData.data;
    currentFileList.forEach((item) => {
      if (item.id === file.id) {
        if (item.status === 2 && file.loaded) {
          const speed =
            (file.loaded / (file.currentTime - item.startTime)) * 1000;
          item.speed = formatSize(speed);
          // console.log(file.total, file.loaded, speed)
          item.remainTime = formatDate(
            (file.total - file.loaded) / speed - 28800,
            'HH:mm:ss'
          );
        }
        for (let i in file) {
          if (file[i] !== item[i]) {
            item[i] = file[i];
          }
        }
      }
    });
    this.setState({
      currentFileList: [...currentFileList],
    });
  }

  // 添加文件到上传列表
  addList(file) {
    const { currentFileList } = this.state;
    currentFileList.push(file.data);
    this.setState({
      currentFileList: [...currentFileList],
    });
  }

  // 从上传列表中删除文件
  deleteList(item) {
    const { currentFileList, fileList } = this.state;

    const newFileList = fileList.filter((file) => {
      return file.name !== item.name;
    });

    currentFileList.forEach((file, index, arr) => {
      if (file.id === item.id) {
        arr.splice(index, 1);
      }
    });

    this.setState({
      currentFileList: [...currentFileList],
      fileList: [...newFileList],
    });

    this.uploader.cancel(item.id);
  }

  // 初始化上传句柄
  initHandler() {
    const { options } = this.state;
    const uploader = new Uploader();
    uploader.init(options);

    // 上传文件队列回调
    uploader.on('filequeue', (isFileInFolder, file) => {
      const { uploadModel } = this.state;
      if (!isFileInFolder) {
        const handleFile = {
          id: file.id,
          isFolder: file.isFolder,
          progress: 0,
          path: file.path,
          relativePath: file.path,
          name: file.name,
          status: 1,
          loaded: 0,
          total: 0,
          speed: 0,
          remainTime: 0,
          errmsg: null,
          startTime: Date.now(),
        };
        this.addList({
          data: handleFile,
          type: uploadModel,
        });
      }
    });

    // 开始上传完成回调
    uploader.on('startupload', (folder, fid) => {
      const { uploadModel } = this.state;
      if (!folder) {
        this.updateList({
          data: {
            id: fid,
            status: 2,
          },
          type: uploadModel,
        });
      }
    });

    // 上传成功回调
    uploader.on('uploadsuccess', (file) => {
      const { uploadModel, fileList } = this.state;
      this.updateList({
        data: {
          id: file.id,
          status: 3,
        },
        type: uploadModel,
      });

      const newFileList = fileList.filter((item) => {
        return item.name !== file.name;
      });

      this.setState({
        fileList: [...newFileList],
      });
    });

    // 上传出错回调
    uploader.on('uploaderror', (file, isFoler, errmsg) => {
      message.error(errmsg);
      this.setState(() => ({
        fileList: [],
      }));
    });

    // 全部上传完成回调
    // uploader.on('uploadall', () => {
    //   console.log('this.uploader', '上传完成')
    //   !this.isClickCancel ? message.success("上传完成") : message.success("取消上传")
    //   this.setState(() => ({
    //     fileList: []
    //   }));
    // })

    // 上传进度回调
    uploader.on('progress', (fid, loaded, total) => {
      if (!total) return;
      const { uploadModel } = this.state;
      const currentTime = Date.now();
      const updateOption = {
        data: {
          id: fid,
          progress: loaded / total,
          loaded: loaded,
          total: total,
          currentTime: currentTime,
        },
        type: uploadModel,
      };
      // console.log('updateOption', updateOption)
      this.updateList(updateOption);
    });

    // 上传异常回调
    uploader.on('queuederror', (msg) => {
      message.error(msg);
      this.setState(() => ({
        fileList: [],
      }));
    });

    // 系统异常回调
    uploader.on('error', (msg) => {
      message.error(msg);
      this.setState(() => ({
        fileList: [],
      }));
    });

    // 重名文件检查
    uploader.on('duplicateList', (files) => {
      console.log('文件重名', files);
      this.setState({
        dupFileList: [...files],
      });
      this.delDupList();
    });

    return uploader;
  }

  // 处理重名文件
  delDupList() {
    const { dupFileList } = this.state;
    if (dupFileList?.length) {
      this.setState({
        dupFile: {
          isModalVisible: true,
          fname: dupFileList[0].name, // 重名文件名称
          status: dupFileList[0].status, // 重名文件状态
        },
      });
    }
  }

  // 获取access_token
  getAccessToken(params) {
    getAccessToken(params).then((res) => {
      if (res.error) {
        message.error(res.errmsg);
        return;
      }
      const { options } = this.state;
      this.setState({
        options: Object.assign(options, res.data, {
          qid: params.qid,
          path: params.path,
          env: params.env,
          concurrency: params.concurrency,
        }),
      });
      localStorage.setItem(
        'formData',
        JSON.stringify(Object.assign(options, params))
      );
      this.uploader.init(options);
      message.success('获取token成功');
    });
  }

  // 更新access_token
  onSearch = (value) => this.getAccessToken(value);

  // 初始化组件
  componentDidMount() {
    this.initOptions();
    this.uploader = this.initHandler();
  }

  // 初始化配置项
  initOptions() {
    const { options } = this.state;
    const localData = this.getLocallData();
    this.setState({
      options: Object.assign(options, localData, { env: options.env }),
    });
  }

  // 获取本地数据
  getLocallData() {
    const formLocallData = localStorage.getItem('formData') || '{}';
    let fromData = {};
    if (formLocallData) {
      fromData = JSON.parse(formLocallData) || {};
      if (!Object.keys(fromData).length) {
        fromData = {};
      }
    }
    return fromData;
  }

  getFromData = (value) => {
    const data = Object.assign({ method: 'Oauth.getAccessToken' }, value);
    this.getAccessToken(data);
  };

  customRequest = (data) => {
    console.log('data', data);
    // this.uploader.uploader.addWaitFile([data.file])
  };

  // 重名文件继续上传
  handleOk = () => {
    this.isClickCancel = false;
    const { dupFileList } = this.state;
    dupFileList.shift();
    this.setState({
      dupFile: {
        isModalVisible: false,
        fname: '', // 重名文件名称
        status: '', // 重名文件状态
      },
    });
    if (dupFileList.length === 0) {
      this.uploader.resume();
    } else {
      this.delDupList();
    }
  };

  // 重名文件取消上传
  handleCancel = () => {
    this.isClickCancel = true;

    const uploader = this.uploader;
    const { dupFileList, fileList } = this.state;
    const { name: fname } = dupFileList.shift();

    const newFileList = fileList.filter((file) => {
      return file.name !== fname;
    });

    this.setState({
      dupFile: {
        isModalVisible: false,
        fname: '',
        status: '',
      },
      fileList: [...newFileList],
    });

    const list = uploader.uploader.filesInWait.list;

    list.forEach((item) => {
      if (item.name === fname) {
        item.status = 'file_status_cancelled';
      }
    });

    if (dupFileList.length === 0) {
      uploader.resume();
    } else {
      this.delDupList();
    }
  };

  render() {
    const { uploading, fileList, dupFile, currentFileList } = this.state;

    const props = {
      onRemove: (file) => {
        this.setState((state) => {
          const index = state.fileList.indexOf(file);
          const newFileList = state.fileList.slice();
          newFileList.splice(index, 1);
          return {
            fileList: newFileList,
          };
        });
      },
      beforeUpload: (file) => {
        this.setState((state) => ({
          fileList: [...state.fileList, file],
        }));
        return false;
      },
      fileList,
    };
    const propsDrop = {
      name: 'file',
      multiple: true,
      onDrop: (e) => {
        if (this.state.uploadModel === 'handleUpload') {
          this.setState({
            currentFileList: [],
          });
        }
        this.setState({
          uploadModel: 'dragUpload',
        });
        const uploader = (this.uploader = this.initHandler());
        console.log('Dropped files', e.dataTransfer.files);
        uploader.uploader.addWaitFile(e.dataTransfer.files);
      },
      showUploadList: false,
    };
    return (
      <>
        <PageHeader className="site-page-header" title="获取accessToken" />
        <UploadForm
          getFromData={this.getFromData}
          getLocallData={this.getLocallData}
        />
        <PageHeader
          className="site-page-header"
          title="手动上传(支持单实例并发上传)"
        />
        <Card>
          <Space direction="vertical">
            {/* <p>1、手动上传</p> */}
            <AutoUpload {...props} multiple>
              <Button icon={<UploadOutlined />}>Select File</Button>
            </AutoUpload>
            <Button
              type="primary"
              onClick={this.handleUpload}
              disabled={fileList.length === 0}
              loading={uploading}
              style={{ marginTop: 16 }}
            >
              {uploading ? 'Uploading' : 'Start Upload'}
            </Button>
          </Space>
          {this.state.uploadModel === 'handleUpload' &&
            currentFileList.length !== 0 && (
              <UploadProgress
                filelist={currentFileList}
                deleteList={this.deleteList.bind(this)}
                uploader={this.uploader}
              />
            )}
        </Card>
        <PageHeader
          className="site-page-header"
          title="拖拽上传(支持多实例并发上传)"
        />
        <Card>
          <Space direction="vertical">
            <Space>
              <Dragger
                {...propsDrop}
                customRequest={this.customRequest}
                className="customDragger"
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  Drag file to this area to upload
                </p>
                <p className="ant-upload-hint">
                  Support for a single or bulk upload. Strictly prohibit from
                  uploading company data or other band files
                </p>
              </Dragger>
            </Space>
            {this.state.uploadModel === 'dragUpload' &&
              currentFileList.length !== 0 && (
                <UploadProgress
                  filelist={currentFileList}
                  deleteList={this.deleteList.bind(this)}
                  uploader={this.uploader}
                />
              )}
          </Space>
        </Card>
        <Modal
          title={
            dupFile.status == 1
              ? '文件重名：(当前文件夹下)'
              : '文件重名：(当前项目下)'
          }
          visible={dupFile.isModalVisible}
          onOk={this.handleOk}
          onCancel={this.handleCancel}
          footer={[
            <Button key="2" onClick={this.handleCancel}>
              取消
            </Button>,
            <Button key="3" type="primary" onClick={this.handleOk}>
              继续上传
            </Button>,
          ]}
        >
          <p>文件名：{dupFile.fname}</p>
        </Modal>
      </>
    );
  }
}
